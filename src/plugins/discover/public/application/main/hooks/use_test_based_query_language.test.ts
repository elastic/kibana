/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { discoverServiceMock } from '../../../__mocks__/services';
import { useTextBasedQueryLanguage } from './use_text_based_query_language';
import { GetStateReturn } from '../services/discover_state';
import { BehaviorSubject } from 'rxjs';
import { FetchStatus } from '../../types';
import { DataDocuments$, RecordRawType } from './use_saved_search';
import { DataTableRecord } from '../../../types';

describe('useTextBasedQueryLanguage', () => {
  test('state is replaced correctly depending on request', async () => {
    const replaceUrlAppState = jest.fn();
    const stateContainer = {
      replaceUrlAppState,
    } as unknown as GetStateReturn;
    const query = { sql: 'SELECT * from the-data-view-title' };

    const msgLoading = {
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.LOADING,
      query,
    };

    const documents$ = new BehaviorSubject(msgLoading) as DataDocuments$;

    const props = {
      documents$,
      dataViews: discoverServiceMock.dataViews,
      stateContainer,
    };

    renderHook(() => useTextBasedQueryLanguage(props));

    await waitFor(() => expect(replaceUrlAppState).toHaveBeenCalledTimes(1));
    expect(replaceUrlAppState).toHaveBeenCalledWith({ index: 'the-data-view-id' });

    replaceUrlAppState.mockReset();
    const msgComplete = {
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.COMPLETE,
      result: [
        {
          id: '1',
          raw: { field1: 1, field2: 2 },
          flattened: { field1: 1, field2: 2 },
        } as DataTableRecord,
      ],
      query,
    };
    documents$.next(msgComplete);
    await waitFor(() => expect(stateContainer.replaceUrlAppState).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(replaceUrlAppState).toHaveBeenCalledWith({
        index: 'the-data-view-id',
        columns: ['field1', 'field2'],
      });
    });

    replaceUrlAppState.mockReset();
    const msgCompleteV2 = {
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.COMPLETE,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as DataTableRecord,
      ],
      query: { sql: 'SELECT field1 from the-data-view-title' },
    };
    documents$.next(msgCompleteV2);
    await waitFor(() => expect(stateContainer.replaceUrlAppState).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(replaceUrlAppState).toHaveBeenCalledWith({
        index: 'the-data-view-id',
        columns: ['field1'],
      });
    });
  });
});
