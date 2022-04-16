/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createAction } from '@kbn/ui-actions-plugin/public';

export const ACTION_NAVIGATE = 'ACTION_NAVIGATE';

export const createNavigateAction = () =>
  createAction({
    id: ACTION_NAVIGATE,
    type: ACTION_NAVIGATE,
    getDisplayName: () => 'Navigate',
    execute: async (event: any) => {
      window.location.href = event.href;
    },
  });
