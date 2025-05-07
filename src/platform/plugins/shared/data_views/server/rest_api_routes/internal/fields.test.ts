/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { createHandler } from './fields';
import { IndexPatternsFetcher } from '../../fetcher';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { RequestHandlerContext } from '@kbn/core/server';

jest.mock('../../fetcher');

describe('createHandler', () => {
  const mockIsRollupsEnabled = jest.fn();
  const mockContext = {
    core: coreMock.createRequestHandlerContext(),
  } as unknown as RequestHandlerContext;
  const mockResponse = httpServerMock.createResponseFactory();
  let getFieldsForWildcard: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    getFieldsForWildcard = jest.fn().mockResolvedValue({
      fields: [{ name: 'field1', type: 'string' }],
      indices: ['index1'],
    });

    (IndexPatternsFetcher as jest.Mock).mockImplementation(() => ({
      getFieldsForWildcard,
    }));
  });

  it('uses the allow_hidden query parameter in indexPatterns.getFieldsForWildcard', async () => {
    const query = {
      allow_hidden: true,
      field_types: [],
      meta_fields: ['_id', '_type'],
      type: 'test-type',
    };
    const mockRequest = httpServerMock.createKibanaRequest({
      query,
    });

    const handlerFn = createHandler(mockIsRollupsEnabled);
    await handlerFn(mockContext, mockRequest, mockResponse);
    expect(getFieldsForWildcard).toHaveBeenCalledWith(
      expect.objectContaining({
        allowHidden: true,
      })
    );
  });
});
