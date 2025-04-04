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
  selectTab,
  selectTabRuntimeState,
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
    const tabId = store.getState().tabs.allIds[0];
    expect(selectTab(store.getState(), tabId).dataViewId).toBeUndefined();
    expect(
      selectTabRuntimeState(runtimeStateManager, tabId).currentDataView$.value
    ).toBeUndefined();
    store.dispatch(internalStateActions.setDataView({ tabId, dataView: dataViewMock }));
    expect(selectTab(store.getState(), tabId).dataViewId).toBe(dataViewMock.id);
    expect(selectTabRuntimeState(runtimeStateManager, tabId).currentDataView$.value).toBe(
      dataViewMock
    );
  });
});
