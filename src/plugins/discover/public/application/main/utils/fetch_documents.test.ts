/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { fetchDocuments } from './fetch_documents';
import { throwError as throwErrorRx, of } from 'rxjs';
import { RequestAdapter } from '../../../../../inspector';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../__mocks__/services';
import { IKibanaSearchResponse } from 'src/plugins/data/common';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

const getDeps = () => ({
  abortController: new AbortController(),
  inspectorAdapters: { requests: new RequestAdapter() },
  onResults: jest.fn(),
  searchSessionId: '123',
  services: discoverServiceMock,
});

describe('test fetchDocuments', () => {
  test('resolves with returned documents', async () => {
    const hits = [
      { _id: '1', foo: 'bar' },
      { _id: '2', foo: 'baz' },
    ];
    savedSearchMock.searchSource.fetch$ = () =>
      of({ rawResponse: { hits: { hits } } } as unknown as IKibanaSearchResponse<SearchResponse>);
    expect(fetchDocuments(savedSearchMock.searchSource, getDeps())).resolves.toEqual(hits);
  });

  test('rejects on query failure', () => {
    savedSearchMock.searchSource.fetch$ = () => throwErrorRx({ msg: 'Oh noes!' });

    expect(fetchDocuments(savedSearchMock.searchSource, getDeps())).rejects.toEqual({
      msg: 'Oh noes!',
    });
  });
});
