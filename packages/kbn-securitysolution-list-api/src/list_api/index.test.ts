/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createListIndex, deleteList, exportList, findLists, importList, readListIndex } from '.';
import {
  ApiPayload,
  DeleteListParams,
  ExportListParams,
  FindListsParams,
  ImportListParams,
} from './types';

import { HttpFetchOptions } from '@kbn/core-http-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

import { getFoundListSchemaMock } from './mocks/response/found_list_schema.mock';
import { getListResponseMock } from './mocks/response/list_schema.mock';
import { getListItemIndexExistSchemaResponseMock } from './mocks/response/list_item_index_exist_schema.mock';
import { getAcknowledgeSchemaResponseMock } from './mocks/response/acknowledge_schema.mock';

describe('Value Lists API', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
  });
  describe('deleteList', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getListResponseMock());
    });

    it('DELETEs specifying the id as a query parameter', async () => {
      const abortCtrl = new AbortController();
      const payload: ApiPayload<DeleteListParams> = {
        deleteReferences: false,
        id: 'list-id',
        ignoreReferences: true,
      };
      await deleteList({
        http: httpMock,
        ...payload,
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists',
        expect.objectContaining({
          method: 'DELETE',
          query: { deleteReferences: false, id: 'list-id', ignoreReferences: true },
        })
      );
    });

    it('rejects with an error if request payload is invalid (and does not make API call)', async () => {
      const abortCtrl = new AbortController();
      const payload: Omit<ApiPayload<DeleteListParams>, 'id'> & {
        id: number;
      } = { id: 23 };

      await expect(
        deleteList({
          http: httpMock,
          ...(payload as unknown as ApiPayload<DeleteListParams>),
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "23" supplied to "id"'));
      expect(httpMock.fetch).not.toHaveBeenCalled();
    });

    it('rejects with an error if response payload is invalid', async () => {
      const abortCtrl = new AbortController();
      const payload: ApiPayload<DeleteListParams> = { id: 'list-id' };
      const badResponse = { ...getListResponseMock(), id: undefined };
      httpMock.fetch.mockResolvedValue(badResponse);

      await expect(
        deleteList({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "id"'));
    });
  });
  describe('findLists', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getFoundListSchemaMock());
    });

    it('GETs from the lists endpoint', async () => {
      const abortCtrl = new AbortController();
      await findLists({
        http: httpMock,
        pageIndex: 1,
        pageSize: 10,
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/_find',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('sends pagination as query parameters', async () => {
      const abortCtrl = new AbortController();
      await findLists({
        cursor: 'cursor',
        http: httpMock,
        pageIndex: 1,
        pageSize: 10,
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/_find',
        expect.objectContaining({
          query: {
            cursor: 'cursor',
            page: 1,
            per_page: 10,
          },
        })
      );
    });

    it('sends sort_field and sort_order as query parameters', async () => {
      const abortCtrl = new AbortController();
      await findLists({
        cursor: 'cursor',
        http: httpMock,
        pageIndex: 1,
        pageSize: 10,
        signal: abortCtrl.signal,
        sortField: 'created_at',
        sortOrder: 'desc',
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/_find',
        expect.objectContaining({
          query: {
            cursor: 'cursor',
            page: 1,
            per_page: 10,
            sort_field: 'created_at',
            sort_order: 'desc',
          },
        })
      );
    });

    it('rejects with an error if request payload is invalid (and does not make API call)', async () => {
      const abortCtrl = new AbortController();
      const payload: ApiPayload<FindListsParams> = {
        pageIndex: 10,
        pageSize: 0,
      };

      await expect(
        findLists({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "0" supplied to "per_page"'));
      expect(httpMock.fetch).not.toHaveBeenCalled();
    });

    it('rejects with an error if response payload is invalid', async () => {
      const abortCtrl = new AbortController();
      const payload: ApiPayload<FindListsParams> = {
        pageIndex: 1,
        pageSize: 10,
      };
      const badResponse = { ...getFoundListSchemaMock(), cursor: undefined };
      httpMock.fetch.mockResolvedValue(badResponse);

      await expect(
        findLists({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "cursor"'));
    });
  });
  describe('importList', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getListResponseMock());
    });

    it('POSTs the file', async () => {
      const abortCtrl = new AbortController();
      const file = new File([], 'name');

      await importList({
        file,
        http: httpMock,
        listId: 'my_list',
        signal: abortCtrl.signal,
        type: 'keyword',
      });
      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/items/_import',
        expect.objectContaining({
          method: 'POST',
        })
      );

      // httpmock's fetch signature is inferred incorrectly
      const [[, { body }]] = httpMock.fetch.mock.calls as unknown as Array<
        [unknown, HttpFetchOptions]
      >;
      const actualFile = (body as FormData).get('file');
      expect(actualFile).toEqual(file);
    });

    it('sends type and id as query parameters', async () => {
      const abortCtrl = new AbortController();
      const file = new File([], 'name');

      await importList({
        file,
        http: httpMock,
        listId: 'my_list',
        signal: abortCtrl.signal,
        type: 'keyword',
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/items/_import',
        expect.objectContaining({
          query: { list_id: 'my_list', type: 'keyword' },
        })
      );
    });

    it('rejects with an error if request body is invalid (and does not make API call)', async () => {
      const abortCtrl = new AbortController();
      const payload: ApiPayload<ImportListParams> = {
        file: undefined as unknown as File,
        listId: 'list-id',
        type: 'ip',
      };

      await expect(
        importList({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "file"'));
      expect(httpMock.fetch).not.toHaveBeenCalled();
    });

    it('rejects with an error if request params are invalid (and does not make API call)', async () => {
      const abortCtrl = new AbortController();
      const file = new File([], 'name');
      const payload: ApiPayload<ImportListParams> = {
        file,
        listId: 'list-id',
        type: 'other' as 'ip',
      };

      await expect(
        importList({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "other" supplied to "type"'));
      expect(httpMock.fetch).not.toHaveBeenCalled();
    });

    it('rejects with an error if response payload is invalid', async () => {
      const abortCtrl = new AbortController();
      const file = new File([], 'name');
      const payload: ApiPayload<ImportListParams> = {
        file,
        listId: 'list-id',
        type: 'ip',
      };
      const badResponse = { ...getListResponseMock(), id: undefined };
      httpMock.fetch.mockResolvedValue(badResponse);

      await expect(
        importList({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "id"'));
    });
  });
  describe('exportList', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue({});
    });

    it('POSTs to the export endpoint', async () => {
      const abortCtrl = new AbortController();

      await exportList({
        http: httpMock,
        listId: 'my_list',
        signal: abortCtrl.signal,
      });
      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/items/_export',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('sends type and id as query parameters', async () => {
      const abortCtrl = new AbortController();

      await exportList({
        http: httpMock,
        listId: 'my_list',
        signal: abortCtrl.signal,
      });
      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/items/_export',
        expect.objectContaining({
          query: { list_id: 'my_list' },
        })
      );
    });

    it('rejects with an error if request params are invalid (and does not make API call)', async () => {
      const abortCtrl = new AbortController();
      const payload: ApiPayload<ExportListParams> = {
        listId: 23 as unknown as string,
      };

      await expect(
        exportList({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "23" supplied to "list_id"'));
      expect(httpMock.fetch).not.toHaveBeenCalled();
    });
  });

  describe('readListIndex', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getListItemIndexExistSchemaResponseMock());
    });

    it('GETs the list index', async () => {
      const abortCtrl = new AbortController();
      await readListIndex({
        http: httpMock,
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/index',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('returns the response when valid', async () => {
      const abortCtrl = new AbortController();
      const result = await readListIndex({
        http: httpMock,
        signal: abortCtrl.signal,
      });

      expect(result).toEqual(getListItemIndexExistSchemaResponseMock());
    });

    it('rejects with an error if response payload is invalid', async () => {
      const abortCtrl = new AbortController();
      const badResponse = { ...getListItemIndexExistSchemaResponseMock(), list_index: undefined };
      httpMock.fetch.mockResolvedValue(badResponse);

      await expect(
        readListIndex({
          http: httpMock,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "list_index"'));
    });
  });

  describe('createListIndex', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getAcknowledgeSchemaResponseMock());
    });

    it('GETs the list index', async () => {
      const abortCtrl = new AbortController();
      await createListIndex({
        http: httpMock,
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/index',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('returns the response when valid', async () => {
      const abortCtrl = new AbortController();
      const result = await createListIndex({
        http: httpMock,
        signal: abortCtrl.signal,
      });

      expect(result).toEqual(getAcknowledgeSchemaResponseMock());
    });

    it('rejects with an error if response payload is invalid', async () => {
      const abortCtrl = new AbortController();
      const badResponse = { acknowledged: undefined };
      httpMock.fetch.mockResolvedValue(badResponse);

      await expect(
        createListIndex({
          http: httpMock,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual(new Error('Invalid value "undefined" supplied to "acknowledged"'));
    });
  });
});
