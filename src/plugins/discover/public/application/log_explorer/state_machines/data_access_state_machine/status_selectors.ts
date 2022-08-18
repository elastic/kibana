/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataAccessService } from './state_machine';

export const selectIsLoading = (state: DataAccessService['state']) =>
  selectIsReloading(state) || selectIsUpdating(state);

export const selectIsReloading = (state: DataAccessService['state']) =>
  state.matches({ documents: 'loadingAround' });

export const selectIsUpdating = (state: DataAccessService['state']) =>
  state.matches({ documents: 'loadingTop' }) ||
  state.matches({ documents: 'loadingBottom' }) ||
  state.matches({ documents: 'extendingTop' }) ||
  state.matches({ documents: 'extendingBottom' });
