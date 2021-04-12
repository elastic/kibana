/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LOADING_STATUS } from './index';

export function createInitialLoadingStatusState() {
  return {
    anchor: LOADING_STATUS.UNINITIALIZED,
    predecessors: LOADING_STATUS.UNINITIALIZED,
    successors: LOADING_STATUS.UNINITIALIZED,
  };
}
