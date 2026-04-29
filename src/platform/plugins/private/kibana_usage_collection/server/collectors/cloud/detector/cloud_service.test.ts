/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CloudService } from './cloud_service';
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
      await expect(() =>
        service._checkIfService(undefined)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"not implemented"`);
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

    it('throws error upon failure to parse body as object', () => {
      expect(() => service._parseResponse()).toThrowErrorMatchingInlineSnapshot(
        `"Unable to handle body"`
      );
      expect(() => service._parseResponse(null)).toThrowErrorMatchingInlineSnapshot(
        `"Unable to handle body"`
      );
      expect(() => service._parseResponse({})).toThrowErrorMatchingInlineSnapshot(
        `"Unable to handle body"`
      );
      expect(() => service._parseResponse(123)).toThrowErrorMatchingInlineSnapshot(
        `"Unable to handle body"`
      );
      expect(() => service._parseResponse('raw string')).toThrowErrorMatchingInlineSnapshot(
        `"'raw string' is not a JSON object"`
      );
      expect(() => service._parseResponse('{{}')).toThrowErrorMatchingInlineSnapshot(
        `"'{{}' is not a JSON object"`
      );
    });

    it('expects unusable bodies', () => {
      const parseBody = jest.fn().mockReturnValue(null);

      expect(() =>
        service._parseResponse(JSON.stringify(body), parseBody)
      ).toThrowErrorMatchingInlineSnapshot(`"Unable to handle body"`);
      expect(parseBody).toBeCalledTimes(1);
      expect(parseBody).toBeCalledWith(body);
      parseBody.mockClear();

      expect(() => service._parseResponse(body, parseBody)).toThrowErrorMatchingInlineSnapshot(
        `"Unable to handle body"`
      );
      expect(parseBody).toBeCalledTimes(1);
      expect(parseBody).toBeCalledWith(body);
    });

    it('uses parsed object to create response', async () => {
      const serviceResponse = new CloudServiceResponse('a123', true, { id: 'xyz' });
      const parseBody = jest.fn().mockReturnValue(serviceResponse);

      const response = await service._parseResponse(body, parseBody);
      expect(parseBody).toBeCalledWith(body);
      expect(response).toBe(serviceResponse);
    });

    it('parses object before passing it to parseBody to create response', async () => {
      const serviceResponse = new CloudServiceResponse('a123', true, { id: 'xyz' });
      const parseBody = jest.fn().mockReturnValue(serviceResponse);

      const response = await service._parseResponse(JSON.stringify(body), parseBody);
      expect(parseBody).toBeCalledWith(body);
      expect(response).toBe(serviceResponse);
    });
  });
});
