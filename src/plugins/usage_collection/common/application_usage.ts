/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MAIN_APP_DEFAULT_VIEW_ID } from './constants';

export const getDailyId = ({
  appId,
  dayId,
  viewId,
}: {
  viewId: string;
  appId: string;
  dayId: string;
}) => {
  return !viewId || viewId === MAIN_APP_DEFAULT_VIEW_ID
    ? `${appId}:${dayId}`
    : `${appId}:${dayId}:${viewId}`;
};
