/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CloudService, Response } from './cloud_service';
import { CloudServiceResponse } from './cloud_response';

describe('CloudService', () => {
  // @ts-expect-error Creating an instance of an abstract class for testing
  const service = new CloudService('xyz');

  describe('getName', () => {
    it('is named by the constructor', () => {
      expect(service.getName()).toEqual('xyz');
    });
  });

  describe('checkIfService', () => {
    it('is always unconfirmed', async () => {
      const response = await service.checkIfService();

      expect(response.getName()).toEqual('xyz');
      expect(response.isConfirmed()).toBe(false);
    });
  });

  describe('_checkIfService', () => {
    it('throws an exception unless overridden', async () => {
      expect(async () => {
        await service._checkIfService(undefined);
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"not implemented"`);
    });
  });

  describe('_createUnconfirmedResponse', () => {
    it('is always unconfirmed', () => {
      const response = service._createUnconfirmedResponse();

      expect(response.getName()).toEqual('xyz');
      expect(response.isConfirmed()).toBe(false);
    });
  });

  describe('_stringToJson', () => {
    it('only handles strings', () => {
      expect(() => service._stringToJson({})).toThrow();
      expect(() => service._stringToJson(123)).toThrow();
      expect(() => service._stringToJson(true)).toThrow();
    });

    it('fails with unexpected values', () => {
      // array
      expect(() => service._stringToJson('[{}]')).toThrow();
      // normal values
      expect(() => service._stringToJson('true')).toThrow();
      expect(() => service._stringToJson('123')).toThrow();
      expect(() => service._stringToJson('xyz')).toThrow();
      // invalid JSON
      expect(() => service._stringToJson('{"xyz"}')).toThrow();
      // (single quotes are not actually valid in serialized JSON)
      expect(() => service._stringToJson("{'a': 'xyz'}")).toThrow();
      expect(() => service._stringToJson('{{}')).toThrow();
      expect(() => service._stringToJson('{}}')).toThrow();
    });

    it('parses objects', () => {
      const testObject = {
        arbitrary: {
          nesting: {
            works: [1, 2, '3'],
          },
        },
        bool: true,
        and: false,
        etc: 'abc',
      };

      expect(service._stringToJson(' {} ')).toEqual({});
      expect(service._stringToJson('{ "a" : "key" }\n')).toEqual({ a: 'key' });
      expect(service._stringToJson(JSON.stringify(testObject))).toEqual(testObject);
    });
  });

  describe('_parseResponse', () => {
    const body = { some: { body: {} } };

    it('throws error upon failure to parse body as object', async () => {
      expect(async () => {
        await service._parseResponse();
      }).rejects.toMatchInlineSnapshot(`undefined`);
      expect(async () => {
        await service._parseResponse(null);
      }).rejects.toMatchInlineSnapshot(`undefined`);
      expect(async () => {
        await service._parseResponse({});
      }).rejects.toMatchInlineSnapshot(`undefined`);
      expect(async () => {
        await service._parseResponse(123);
      }).rejects.toMatchInlineSnapshot(`undefined`);
      expect(async () => {
        await service._parseResponse('raw string');
      }).rejects.toMatchInlineSnapshot(`[Error: 'raw string' is not a JSON object]`);
      expect(async () => {
        await service._parseResponse('{{}');
      }).rejects.toMatchInlineSnapshot(`[Error: '{{}' is not a JSON object]`);
    });

    it('expects unusable bodies', async () => {
      const parseBody = (parsedBody: Response['body']) => {
        expect(parsedBody).toEqual(body);

        return null;
      };

      expect(async () => {
        await service._parseResponse(JSON.stringify(body), parseBody);
      }).rejects.toMatchInlineSnapshot(`undefined`);
      expect(async () => {
        await service._parseResponse(body, parseBody);
      }).rejects.toMatchInlineSnapshot(`undefined`);
    });

    it('uses parsed object to create response', async () => {
      const serviceResponse = new CloudServiceResponse('a123', true, { id: 'xyz' });
      const parseBody = (parsedBody: Response['body']) => {
        expect(parsedBody).toEqual(body);

        return serviceResponse;
      };

      const response = await service._parseResponse(body, parseBody);

      expect(response).toBe(serviceResponse);
    });
  });
});
