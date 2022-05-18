/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { getEndpointListMock, getListArrayMock, getListMock } from './index.mock';
import { List, list, ListArray, listArray, ListArrayOrUndefined, listArrayOrUndefined } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('Lists', () => {
  describe('list', () => {
    test('it should validate a list', () => {
      const payload = getListMock();
      const decoded = list.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate a list with "namespace_type" of "agnostic"', () => {
      const payload = getEndpointListMock();
      const decoded = list.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should NOT validate a list without an "id"', () => {
      const payload = getListMock();
      // @ts-expect-error
      delete payload.id;
      const decoded = list.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "id"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should NOT validate a list without "namespace_type"', () => {
      const payload = getListMock();
      // @ts-expect-error
      delete payload.namespace_type;
      const decoded = list.decode(payload);
      const message = pipe(decoded, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "namespace_type"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should strip out extra keys', () => {
      const payload: List & {
        extraKey?: string;
      } = getListMock();
      payload.extraKey = 'some value';
      const decoded = list.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getListMock());
    });
  });

  describe('listArray', () => {
    test('it should validate an array of lists', () => {
      const payload = getListArrayMock();
      const decoded = listArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when unexpected type found in array', () => {
      const payload = [1] as unknown as ListArray;
      const decoded = listArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<{| id: NonEmptyString, list_id: NonEmptyString, type: "detection" | "endpoint" | "endpoint_trusted_apps" | "endpoint_events" | "endpoint_host_isolation_exceptions" | "endpoint_blocklists", namespace_type: "agnostic" | "single" |}>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('listArrayOrUndefined', () => {
    test('it should validate an array of lists', () => {
      const payload = getListArrayMock();
      const decoded = listArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when undefined', () => {
      const payload = undefined;
      const decoded = listArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not allow an item that is not of type "list" in array', () => {
      const payload = [1] as unknown as ListArrayOrUndefined;
      const decoded = listArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "(Array<{| id: NonEmptyString, list_id: NonEmptyString, type: "detection" | "endpoint" | "endpoint_trusted_apps" | "endpoint_events" | "endpoint_host_isolation_exceptions" | "endpoint_blocklists", namespace_type: "agnostic" | "single" |}> | undefined)"',
        'Invalid value "[1]" supplied to "(Array<{| id: NonEmptyString, list_id: NonEmptyString, type: "detection" | "endpoint" | "endpoint_trusted_apps" | "endpoint_events" | "endpoint_host_isolation_exceptions" | "endpoint_blocklists", namespace_type: "agnostic" | "single" |}> | undefined)"',
      ]);
      expect(message.schema).toEqual({});
    });
  });
});
