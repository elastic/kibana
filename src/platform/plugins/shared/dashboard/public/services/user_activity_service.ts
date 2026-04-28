/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreServices } from './kibana_services';

let userActivityService;
const sessions: { [id: string]: { startTime: number; pauseTime: number } } = {};

let startPause: number | undefined;
const onBlur = () => {
  console.log('on blur');
  startPause = Date.now();
};
const onFocus = (id: string) => {
  console.log('on focus', id);
  if (startPause !== undefined) {
    const endPause = Date.now();
    if (sessions[id]) {
      sessions[id].pauseTime += endPause - startPause;
    }
    console.log({ test: sessions[id] });
  }
  startPause = undefined;
};

let onFocusId;

export const getDashboardUserActivityService = () => {
  return userActivityService
    ? userActivityService
    : {
        startDashboardView: (id: string) => {
          console.log('startDashboardView', id);
          if (!sessions[id]) sessions[id] = { startTime: Date.now(), pauseTime: 0 };
          onFocusId = () => onFocus(id);
          window.addEventListener('focus', onFocusId);
          window.addEventListener('blur', onBlur);
        },
        endDashboardView: async (id: string, title: string) => {
          console.log('END', id, title);
          const startTime = sessions[id].startTime;
          const endTime = Date.now();
          const result = await coreServices.http.post(
            `/internal/dashboard/user_activity/view/${id}`,
            {
              body: JSON.stringify({
                title,
                duration: startTime ? Math.abs(endTime - startTime) : 0,
              }),
              method: 'POST',
              asSystemRequest: true,
            }
          );
          delete sessions[id];
          if (onFocusId) window.removeEventListener('focus', onFocusId);
          window.removeEventListener('blur', onBlur);
          return result;
        },
      };
};
