/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import { DataViewSource, type DataSource } from '@kbn/data-source';
import { getPreviewDataObservable } from './use_preview_data';
import { FetchStatus } from '../../../types';
import { getTabRuntimeStateMock } from '../../state_management/redux/__mocks__/runtime_state.mocks';
import { getRuntimeStateManagerMock } from '../../state_management/redux/__mocks__/runtime_state.mocks';
import { getTabStateMock } from '../../state_management/redux/__mocks__/internal_state.mocks';
import type { DiscoverDataStateContainer } from '../../state_management/discover_data_state_container';

const TAB_ID = 'tab-1';

const getPreview = async ({ name }: { name?: string }) => {
  const dataView = createStubDataView({
    spec: { id: 'data-view-id', title: 'logs-*', name },
  });
  const runtimeStateManager = getRuntimeStateManagerMock({
    tabs: {
      byId: {
        [TAB_ID]: getTabRuntimeStateMock({
          dataStateContainer$: new BehaviorSubject<DiscoverDataStateContainer | undefined>({
            data$: { main$: new BehaviorSubject({ fetchStatus: FetchStatus.COMPLETE }) },
          } as unknown as DiscoverDataStateContainer),
          currentDataSource$: new BehaviorSubject<DataSource | undefined>(
            new DataViewSource(dataView)
          ),
        }),
      },
    },
  });
  const tabState = getTabStateMock({
    id: TAB_ID,
    appState: { query: { query: '', language: 'kuery' } },
    initialInternalState: {
      serializedSearchSource: { index: { id: 'data-view-id', name: 'Name from saved state' } },
    },
  });

  return firstValueFrom(getPreviewDataObservable(runtimeStateManager, tabState, []));
};

describe('getPreviewDataObservable', () => {
  it('uses the name of a named data view', async () => {
    expect((await getPreview({ name: 'My data view' })).title).toBe('Data view: My data view');
  });

  it('falls back to the name in the initial state for an unnamed data view', async () => {
    expect((await getPreview({})).title).toBe('Data view: Name from saved state');
  });
});
