/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createSavedObjectsStreamFromNdJson,
  validateTypes,
  validateObjects,
  throwOnHttpHiddenTypes,
  throwOnGloballyHiddenTypes,
  throwIfTypeNotVisibleByAPI,
  throwIfAnyTypeNotVisibleByAPI,
  logWarnOnExternalRequest,
} from './utils';
import { Readable } from 'stream';
import { createPromiseFromStreams, createConcatStream } from '@kbn/utils';
import { catchAndReturnBoomErrors } from './utils';
import Boom from '@hapi/boom';
import type {
  KibanaRequest,
  RequestHandler,
  RequestHandlerContextBase,
  KibanaResponseFactory,
} from '@kbn/core-http-server';
import { kibanaResponseFactory } from '@kbn/core-http-router-server-internal';
import { typeRegistryInstanceMock } from '../saved_objects_service.test.mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';

async function readStreamToCompletion(stream: Readable) {
  return createPromiseFromStreams([stream, createConcatStream([])]);
}

describe('createSavedObjectsStreamFromNdJson', () => {
  it('transforms an ndjson stream into a stream of saved objects', async () => {
    const savedObjectsStream = await createSavedObjectsStreamFromNdJson(
      new Readable({
        read() {
          this.push('{"id": "foo", "type": "foo-type"}\n');
          this.push('{"id": "bar", "type": "bar-type"}\n');
          this.push(null);
        },
      })
    );

    const result = await readStreamToCompletion(savedObjectsStream);

    expect(result).toEqual([
      {
        id: 'foo',
        type: 'foo-type',
      },
      {
        id: 'bar',
        type: 'bar-type',
      },
    ]);
  });

  it('skips empty lines', async () => {
    const savedObjectsStream = await createSavedObjectsStreamFromNdJson(
      new Readable({
        read() {
          this.push('{"id": "foo", "type": "foo-type"}\n');
          this.push('\n');
          this.push('');
          this.push('{"id": "bar", "type": "bar-type"}\n');
          this.push(null);
        },
      })
    );

    const result = await readStreamToCompletion(savedObjectsStream);

    expect(result).toEqual([
      {
        id: 'foo',
        type: 'foo-type',
      },
      {
        id: 'bar',
        type: 'bar-type',
      },
    ]);
  });

  it('filters the export details entry from the stream', async () => {
    const savedObjectsStream = await createSavedObjectsStreamFromNdJson(
      new Readable({
        read() {
          this.push('{"id": "foo", "type": "foo-type"}\n');
          this.push('{"id": "bar", "type": "bar-type"}\n');
          this.push('{"exportedCount": 2, "missingRefCount": 0, "missingReferences": []}\n');
          this.push(null);
        },
      })
    );

    const result = await readStreamToCompletion(savedObjectsStream);

    expect(result).toEqual([
      {
        id: 'foo',
        type: 'foo-type',
      },
      {
        id: 'bar',
        type: 'bar-type',
      },
    ]);
  });

  it('handles an ndjson stream that only contains excluded saved objects', async () => {
    const savedObjectsStream = await createSavedObjectsStreamFromNdJson(
      new Readable({
        read() {
          this.push(
            '{"excludedObjects":[{"id":"foo","reason":"excluded","type":"foo-type"}],"excludedObjectsCount":1,"exportedCount":0,"missingRefCount":0,"missingReferences":[]}\n'
          );
          this.push(null);
        },
      })
    );

    const result = await readStreamToCompletion(savedObjectsStream);
    expect(result).toEqual([]);
  });
});

describe('validateTypes', () => {
  const allowedTypes = ['config', 'index-pattern', 'dashboard'];

  it('returns an error message if some types are not allowed', () => {
    expect(validateTypes(['config', 'not-allowed-type'], allowedTypes)).toMatchInlineSnapshot(
      `"Trying to export non-exportable type(s): not-allowed-type"`
    );
    expect(
      validateTypes(['index-pattern', 'not-allowed-type', 'not-allowed-type-2'], allowedTypes)
    ).toMatchInlineSnapshot(
      `"Trying to export non-exportable type(s): not-allowed-type, not-allowed-type-2"`
    );
  });
  it('returns undefined if all types are allowed', () => {
    expect(validateTypes(allowedTypes, allowedTypes)).toBeUndefined();
    expect(validateTypes(['config'], allowedTypes)).toBeUndefined();
  });
});

describe('validateObjects', () => {
  const allowedTypes = ['config', 'index-pattern', 'dashboard'];

  it('returns an error message if some objects have types that are not allowed', () => {
    expect(
      validateObjects(
        [
          { id: '1', type: 'config' },
          { id: '1', type: 'not-allowed' },
          { id: '42', type: 'not-allowed-either' },
        ],
        allowedTypes
      )
    ).toMatchInlineSnapshot(
      `"Trying to export object(s) with non-exportable types: not-allowed:1, not-allowed-either:42"`
    );
  });
  it('returns undefined if all objects have allowed types', () => {
    expect(
      validateObjects(
        [
          { id: '1', type: 'config' },
          { id: '2', type: 'config' },
          { id: '1', type: 'index-pattern' },
        ],
        allowedTypes
      )
    ).toBeUndefined();
  });
});

describe('catchAndReturnBoomErrors', () => {
  let context: RequestHandlerContextBase;
  let request: KibanaRequest<any, any, any>;
  let response: KibanaResponseFactory;

  const createHandler =
    (handler: () => any): RequestHandler<any, any, any> =>
    () => {
      return handler();
    };

  beforeEach(() => {
    context = {} as any;
    request = {} as any;
    response = kibanaResponseFactory;
  });

  it('should pass-though call parameters to the handler', async () => {
    const handler = jest.fn();
    const wrapped = catchAndReturnBoomErrors(handler);
    await wrapped(context, request, response);
    expect(handler).toHaveBeenCalledWith(context, request, response);
  });

  it('should pass-though result from the handler', async () => {
    const handler = createHandler(() => {
      return 'handler-response';
    });
    const wrapped = catchAndReturnBoomErrors(handler);
    const result = await wrapped(context, request, response);
    expect(result).toBe('handler-response');
  });

  it('should intercept and convert thrown Boom errors', async () => {
    const handler = createHandler(() => {
      throw Boom.notFound('not there');
    });
    const wrapped = catchAndReturnBoomErrors(handler);
    const result = await wrapped(context, request, response);
    expect(result.status).toBe(404);
    expect(result.payload).toEqual({
      error: 'Not Found',
      message: 'not there',
      statusCode: 404,
    });
  });

  it('should re-throw non-Boom errors', async () => {
    const handler = createHandler(() => {
      throw new Error('something went bad');
    });
    const wrapped = catchAndReturnBoomErrors(handler);
    await expect(wrapped(context, request, response)).rejects.toMatchInlineSnapshot(
      `[Error: something went bad]`
    );
  });

  it('should re-throw Boom internal/500 errors', async () => {
    const handler = createHandler(() => {
      throw Boom.internal();
    });
    const wrapped = catchAndReturnBoomErrors(handler);
    await expect(wrapped(context, request, response)).rejects.toMatchInlineSnapshot(
      `[Error: Internal Server Error]`
    );
  });
});

describe('throwOnHttpHiddenTypes', () => {
  it('should throw on types hidden from the HTTP Apis', () => {
    expect(() => {
      throwOnHttpHiddenTypes(['not-allowed-type']);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Unsupported saved object type(s): not-allowed-type: Bad Request"`
    );
    expect(() => {
      throwOnHttpHiddenTypes(['index-pattern', 'not-allowed-type', 'not-allowed-type-2']);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Unsupported saved object type(s): index-pattern, not-allowed-type, not-allowed-type-2: Bad Request"`
    );
  });
  it("returns if there aren't any types provided to check", () => {
    expect(() => {
      throwOnHttpHiddenTypes([]);
    }).not.toThrowError();
  });
});

describe('throwOnGloballyHiddenTypes', () => {
  const httpVisibleTypes = ['config', 'index-pattern', 'dashboard'];

  it('throws if some objects are not globally visible', () => {
    expect(() => {
      throwOnGloballyHiddenTypes(httpVisibleTypes, ['not-allowed-type']);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Unsupported saved object type(s): not-allowed-type: Bad Request"`
    );
  });

  it("returns if there aren't any types provided to check", () => {
    expect(() => {
      throwOnGloballyHiddenTypes(httpVisibleTypes, []);
    }).not.toThrowError();
  });
});

describe('throwIfTypeNotVisibleByAPI', () => {
  const registry = typeRegistryInstanceMock;
  registry.getType.mockImplementation((name: string) => {
    return {
      name,
      hidden: name === 'hidden' ? true : false,
      hiddenFromHttpApis: name === 'hiddenFromHttpApis' ? true : false,
      namespaceType: 'multiple-isolated',
      mappings: { properties: {} },
    };
  });

  it('throws if a type is not visible by to the HTTP APIs', () => {
    expect(() =>
      throwIfTypeNotVisibleByAPI('hiddenFromHttpApis', registry)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Unsupported saved object type: 'hiddenFromHttpApis': Bad Request"`
    );
  });

  it('does not throw when a type is not hidden from the HTTP APIS', () => {
    expect(() => throwIfTypeNotVisibleByAPI('hidden', registry)).not.toThrowError();
  });

  it('does not throw on visible types', () => {
    expect(() => throwIfTypeNotVisibleByAPI('config', registry)).not.toThrowError();
  });
});

describe('throwIfAnyTypeNotVisibleByAPI', () => {
  const registry = typeRegistryInstanceMock;
  registry.getType.mockImplementation((name: string) => {
    return {
      name,
      hidden: name === 'hidden' ? true : false,
      hiddenFromHttpApis: name === 'hiddenFromHttpApis' ? true : false,
      namespaceType: 'multiple-isolated',
      mappings: { properties: {} },
    };
  });

  it('throws if the provided types contains any that are not visible by to the HTTP APIs', () => {
    expect(() =>
      throwIfAnyTypeNotVisibleByAPI(['hiddenFromHttpApis'], registry)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Unsupported saved object type(s): hiddenFromHttpApis: Bad Request"`
    );
  });

  it('does not throw when a type is not hidden from the HTTP APIS', () => {
    expect(() => throwIfAnyTypeNotVisibleByAPI(['hidden'], registry)).not.toThrowError();
  });

  it('does not throw on visible types', () => {
    expect(() => throwIfAnyTypeNotVisibleByAPI(['config'], registry)).not.toThrowError();
  });
});

describe('logWarnOnExternalRequest', () => {
  let logger: MockedLogger;
  const firstPartyRequestHeaders = { 'kbn-version': 'a', referer: 'b' };
  const kibRequest = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
  const extRequest = httpServerMock.createKibanaRequest();

  beforeEach(() => {
    logger = loggerMock.create();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('logs on external requests to non-bulk apis', () => {
    logWarnOnExternalRequest({
      method: 'get',
      path: '/resolve/{type}/{id}',
      req: extRequest,
      logger,
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'The get saved object API /resolve/{type}/{id} is deprecated.'
    );
  });

  it('logs on external requests to bulk apis', () => {
    logWarnOnExternalRequest({
      method: 'post',
      path: '/_bulk_resolve',
      req: extRequest,
      logger,
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'The post saved object API /_bulk_resolve is deprecated.'
    );
  });

  it('does not log a warning on internal requests', () => {
    logWarnOnExternalRequest({
      method: 'get',
      path: '/resolve/{type}/{id}',
      req: kibRequest,
      logger,
    });
    expect(logger.warn).toHaveBeenCalledTimes(0);
    logWarnOnExternalRequest({
      method: 'post',
      path: '/_bulk_resolve',
      req: kibRequest,
      logger,
    });
    expect(logger.warn).toHaveBeenCalledTimes(0);
  });
});
