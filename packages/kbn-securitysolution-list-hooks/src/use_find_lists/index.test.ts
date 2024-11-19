/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { useFindLists } from '.';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import * as Api from '@kbn/securitysolution-list-api';

import { getFoundListSchemaMock } from '../mocks/response/found_list_schema.mock';

jest.mock('@kbn/securitysolution-list-api');

describe('useFindLists', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
    (Api.findLists as jest.Mock).mockResolvedValue(getFoundListSchemaMock());
  });

  it('invokes Api.findLists', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useFindLists());
    act(() => {
      result.current.start({ http: httpMock, pageIndex: 1, pageSize: 10 });
    });
    await waitForNextUpdate();

    expect(Api.findLists).toHaveBeenCalledWith(
      expect.objectContaining({ http: httpMock, pageIndex: 1, pageSize: 10 })
    );
  });
});
