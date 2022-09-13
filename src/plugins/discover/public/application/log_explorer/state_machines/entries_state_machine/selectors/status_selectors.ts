/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EntriesService } from '../state_machine';

export const selectIsLoading = (state: EntriesService['state']) =>
  selectIsReloading(state) || selectIsUpdating(state);

export const selectIsReloading = (state: EntriesService['state']) => state.matches('loadingAround');

export const selectIsUpdating = (state: EntriesService['state']) =>
  state.matches('loadingTop') ||
  state.matches('loadingBottom') ||
  state.matches('extendingTop') ||
  state.matches('extendingBottom');
