/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import {
  createInternalStateStore,
  createRuntimeStateManager,
  internalStateActions,
  selectCurrentTab,
  selectCurrentTabRuntimeState,
} from '.';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { mockCustomizationContext } from '../../../../customizations/__mocks__/customization_context';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

describe('InternalStateStore', () => {
  it('should set data view', () => {
    const runtimeStateManager = createRuntimeStateManager();
    const store = createInternalStateStore({
      services: createDiscoverServicesMock(),
      customizationContext: mockCustomizationContext,
      runtimeStateManager,
      urlStateStorage: createKbnUrlStateStorage(),
    });
    expect(selectCurrentTab(store.getState()).dataViewId).toBeUndefined();
    expect(
      selectCurrentTabRuntimeState(store.getState(), runtimeStateManager).currentDataView$.value
    ).toBeUndefined();
    store.dispatch(internalStateActions.setDataView(dataViewMock));
    expect(selectCurrentTab(store.getState()).dataViewId).toBe(dataViewMock.id);
    expect(
      selectCurrentTabRuntimeState(store.getState(), runtimeStateManager).currentDataView$.value
    ).toBe(dataViewMock);
  });
});
