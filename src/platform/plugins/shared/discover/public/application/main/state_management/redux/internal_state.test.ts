/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { createInternalStateStore, createRuntimeStateManager, internalStateActions } from '.';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';

describe('InternalStateStore', () => {
  it('should set data view', () => {
    const runtimeStateManager = createRuntimeStateManager();
    const store = createInternalStateStore({
      services: createDiscoverServicesMock(),
      runtimeStateManager,
    });
    expect(store.getState().dataViewId).toBeUndefined();
    expect(runtimeStateManager.currentDataView$.value).toBeUndefined();
    store.dispatch(internalStateActions.setDataView(dataViewMock));
    expect(store.getState().dataViewId).toBe(dataViewMock.id);
    expect(runtimeStateManager.currentDataView$.value).toBe(dataViewMock);
  });
});
