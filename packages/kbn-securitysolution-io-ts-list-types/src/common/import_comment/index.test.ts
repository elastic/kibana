/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { getCommentsArrayMock, getCommentsMock } from '../comment/index.mock';
import { getCreateCommentsArrayMock } from '../create_comment/index.mock';
import {
  importComment,
  ImportCommentsArray,
  importCommentsArray,
  ImportCommentsArrayOrUndefined,
  importCommentsArrayOrUndefined,
} from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('ImportComment', () => {
  describe('importComment', () => {
    test('it passes validation with a typical comment', () => {
      const payload = getCommentsMock();
      const decoded = importComment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it passes validation with a new comment', () => {
      const payload = { comment: 'new comment' };
      const decoded = importComment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it fails validation when undefined', () => {
      const payload = undefined;
      const decoded = importComment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "(({| comment: NonEmptyString, created_at: string, created_by: string, id: NonEmptyString |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: NonEmptyString |})"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('importCommentsArray', () => {
    test('it passes validation an array of Comment', () => {
      const payload = getCommentsArrayMock();
      const decoded = importCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it passes validation an array of CreateComment', () => {
      const payload = getCreateCommentsArrayMock();
      const decoded = importCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it passes validation an array of Comment and CreateComment', () => {
      const payload = [...getCommentsArrayMock(), ...getCreateCommentsArrayMock()];
      const decoded = importCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it fails validation when undefined', () => {
      const payload = undefined;
      const decoded = importCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "Array<(({| comment: NonEmptyString, created_at: string, created_by: string, id: NonEmptyString |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: NonEmptyString |})>"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it fails validation when array includes non ImportComment types', () => {
      const payload = [1] as unknown as ImportCommentsArray;
      const decoded = importCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<(({| comment: NonEmptyString, created_at: string, created_by: string, id: NonEmptyString |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: NonEmptyString |})>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('importCommentsArrayOrUndefined', () => {
    test('it passes validation an array of ImportComment', () => {
      const payload = [...getCommentsArrayMock(), ...getCreateCommentsArrayMock()];
      const decoded = importCommentsArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it passes validation when undefined', () => {
      const payload = undefined;
      const decoded = importCommentsArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it fails validation when array includes non ImportComment types', () => {
      const payload = [1] as unknown as ImportCommentsArrayOrUndefined;
      const decoded = importCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<(({| comment: NonEmptyString, created_at: string, created_by: string, id: NonEmptyString |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: NonEmptyString |})>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });
});
