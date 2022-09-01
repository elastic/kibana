/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { renderHook } from '@testing-library/react-hooks';
import { createSearchSessionMock } from '../../../__mocks__/search_session';
import { useTextBasedQueryLanguage } from './use_text_based_query_language';
import { BehaviorSubject } from 'rxjs';
import { DataDocuments$, RecordRawType } from './use_saved_search';
import { act } from 'react-dom/test-utils';
import { FetchStatus } from '../../types';
import { getStateContainer } from '../services/discover_state';
import { savedSearchMock as savedSearch } from '../../../__mocks__/saved_search';
import { discoverServiceMock as services } from '../../../__mocks__/services';
import { buildDataTableRecordList } from '../../../utils/build_data_record';
import { dataViewMock } from '../../../__mocks__/data_view';
import { DataViewListItem } from '@kbn/data-views-plugin/common';

describe('test useTextBasedQueryLanguage', () => {
  test('document$.next is triggering an state update', async () => {
    const { history } = createSearchSessionMock();
    const stateContainer = getStateContainer({
      savedSearch,
      history,
      services,
    });
    const replaceUrlAppState = jest.fn();
    stateContainer.replaceUrlAppState = replaceUrlAppState;
    const documents$ = new BehaviorSubject({
      fetchStatus: FetchStatus.LOADING,
      recordRawType: RecordRawType.PLAIN,
    }) as DataDocuments$;
    const props = {
      documents$,
      stateContainer,
      dataViewList: [dataViewMock as DataViewListItem],
      query: {
        sql: 'SELECT * from the-data-view-title',
      },
    };
    const { rerender } = renderHook(useTextBasedQueryLanguage, { initialProps: props });

    act(() =>
      documents$.next({
        fetchStatus: FetchStatus.COMPLETE,
        recordRawType: RecordRawType.PLAIN,
        result: buildDataTableRecordList([
          { _id: '1', _index: 'logs' },
          { _id: '2', _index: 'logs' },
        ]),
      })
    );

    act(() =>
      documents$.next({
        fetchStatus: FetchStatus.COMPLETE,
        recordRawType: RecordRawType.PLAIN,
        result: buildDataTableRecordList([
          { _id: '3', _index: 'la' },
          { _id: '2', _index: 'le' },
        ]),
      })
    );
    rerender({
      ...props,
      query: {
        sql: 'SELECT _id from the-data-view-title',
      },
      documents$: new BehaviorSubject({
        fetchStatus: FetchStatus.COMPLETE,
        recordRawType: RecordRawType.PLAIN,
        result: buildDataTableRecordList([{ _id: '3', _index: 'la', fields: [] }]),
      }) as DataDocuments$,
    });
    expect(replaceUrlAppState.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "index": "the-data-view-id",
          },
        ],
        Array [
          Object {
            "columns": Array [
              "_id",
              "_index",
            ],
          },
        ],
        Array [
          Object {
            "columns": Array [
              "_id",
              "_index",
              "fields",
            ],
          },
        ],
      ]
    `);
  });
});
