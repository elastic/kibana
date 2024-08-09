/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { CoreSetup } from '@kbn/core-lifecycle-browser';
import { createRepositoryClient } from './create_repository_client';

describe('createRepositoryClient', () => {
  const getMock = jest.fn();
  const coreSetupMock = {
    http: {
      get: getMock,
    },
  } as unknown as CoreSetup;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides a default value for options when they are not required', () => {
    const repository = {
      'GET /internal/handler': {
        endpoint: 'GET /internal/handler',
        handler: jest.fn().mockResolvedValue('OK'),
      },
    };
    const { fetch } = createRepositoryClient<typeof repository>(coreSetupMock);

    fetch('GET /internal/handler');

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenNthCalledWith(1, '/internal/handler', {
      body: undefined,
      query: undefined,
      version: undefined,
    });
  });

  it('extract the version from the endpoint', () => {
    const repository = {
      'GET /api/handler 2024-08-05': {
        endpoint: 'GET /api/handler 2024-08-05',
        handler: jest.fn().mockResolvedValue('OK'),
      },
    };
    const { fetch } = createRepositoryClient<typeof repository>(coreSetupMock);

    fetch('GET /api/handler 2024-08-05');

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenNthCalledWith(1, '/api/handler', {
      body: undefined,
      query: undefined,
      version: '2024-08-05',
    });
  });

  it('passes on the provided client parameters', () => {
    const repository = {
      'GET /internal/handler': {
        endpoint: 'GET /internal/handler',
        handler: jest.fn().mockResolvedValue('OK'),
      },
    };
    const { fetch } = createRepositoryClient<typeof repository>(coreSetupMock);

    fetch('GET /internal/handler', {
      headers: {
        some_header: 'header_value',
      },
    });

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenNthCalledWith(1, '/internal/handler', {
      headers: {
        some_header: 'header_value',
      },
      body: undefined,
      query: undefined,
      version: undefined,
    });
  });

  it('replaces path params before making the call', () => {
    const repository = {
      'GET /internal/handler/{param}': {
        endpoint: 'GET /internal/handler/{param}',
        params: t.type({
          path: t.type({
            param: t.string,
          }),
        }),
        handler: jest.fn().mockResolvedValue('OK'),
      },
    };
    const { fetch } = createRepositoryClient<typeof repository>(coreSetupMock);

    fetch('GET /internal/handler/{param}', {
      params: {
        path: {
          param: 'param_value',
        },
      },
    });

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenNthCalledWith(1, '/internal/handler/param_value', {
      body: undefined,
      query: undefined,
      version: undefined,
    });
  });

  it('passes on the stringified body content when provided', () => {
    const repository = {
      'GET /internal/handler': {
        endpoint: 'GET /internal/handler',
        params: t.type({
          body: t.type({
            payload: t.string,
          }),
        }),
        handler: jest.fn().mockResolvedValue('OK'),
      },
    };
    const { fetch } = createRepositoryClient<typeof repository>(coreSetupMock);

    fetch('GET /internal/handler', {
      params: {
        body: {
          payload: 'body_value',
        },
      },
    });

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenNthCalledWith(1, '/internal/handler', {
      body: JSON.stringify({
        payload: 'body_value',
      }),
      query: undefined,
      version: undefined,
    });
  });

  it('passes on the query parameters when provided', () => {
    const repository = {
      'GET /internal/handler': {
        endpoint: 'GET /internal/handler',
        params: t.type({
          query: t.type({
            parameter: t.string,
          }),
        }),
        handler: jest.fn().mockResolvedValue('OK'),
      },
    };
    const { fetch } = createRepositoryClient<typeof repository>(coreSetupMock);

    fetch('GET /internal/handler', {
      params: {
        query: {
          parameter: 'query_value',
        },
      },
    });

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenNthCalledWith(1, '/internal/handler', {
      body: undefined,
      query: {
        parameter: 'query_value',
      },
      version: undefined,
    });
  });
});
