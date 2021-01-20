/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ResizeChecker } from '../../../../../../kibana_utils/public';

export function subscribeResizeChecker(el: HTMLElement, ...editors: any[]) {
  const checker = new ResizeChecker(el);
  checker.on('resize', () =>
    editors.forEach((e) => {
      if (e.getCoreEditor) {
        e.getCoreEditor().resize();
      } else {
        e.resize();
      }

      if (e.updateActionsBar) {
        e.updateActionsBar();
      }
    })
  );
  return () => checker.destroy();
}
