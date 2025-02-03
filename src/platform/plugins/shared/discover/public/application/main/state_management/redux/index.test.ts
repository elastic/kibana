/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { BehaviorSubject } from 'rxjs';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { createInternalStateStore, internalStateActions } from '.';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';

describe('InternalStateStore', () => {
  it('should set data view', () => {
    const currentDataView$ = new BehaviorSubject<DataView | undefined>(undefined);
    const store = createInternalStateStore({
      services: createDiscoverServicesMock(),
      currentDataView$,
    });
    expect(store.getState().dataViewId).toBeUndefined();
    expect(currentDataView$.value).toBeUndefined();
    store.dispatch(internalStateActions.setDataView(dataViewMock));
    expect(store.getState().dataViewId).toBe(dataViewMock.id);
    expect(currentDataView$.value).toBe(dataViewMock);
  });
});
