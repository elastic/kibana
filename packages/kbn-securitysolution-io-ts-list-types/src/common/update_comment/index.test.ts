/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { getUpdateCommentMock, getUpdateCommentsArrayMock } from './index.mock';
import {
  UpdateComment,
  updateComment,
  UpdateCommentsArray,
  updateCommentsArray,
  UpdateCommentsArrayOrUndefined,
  updateCommentsArrayOrUndefined,
} from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('UpdateComment', () => {
  describe('updateComment', () => {
    test('it should pass validation when supplied typical comment update', () => {
      const payload = getUpdateCommentMock();
      const decoded = updateComment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should fail validation when supplied an undefined for "comment"', () => {
      const payload = getUpdateCommentMock();
      // @ts-expect-error
      delete payload.comment;
      const decoded = updateComment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "comment"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should fail validation when supplied an empty string for "comment"', () => {
      const payload = { ...getUpdateCommentMock(), comment: '' };
      const decoded = updateComment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "comment"']);
      expect(message.schema).toEqual({});
    });

    test('it should pass validation when supplied an undefined for "id"', () => {
      const payload = getUpdateCommentMock();
      delete payload.id;
      const decoded = updateComment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should fail validation when supplied an empty string for "id"', () => {
      const payload = { ...getUpdateCommentMock(), id: '' };
      const decoded = updateComment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "id"']);
      expect(message.schema).toEqual({});
    });

    test('it should strip out extra key passed in', () => {
      const payload: UpdateComment & {
        extraKey?: string;
      } = { ...getUpdateCommentMock(), extraKey: 'some new value' };
      const decoded = updateComment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getUpdateCommentMock());
    });
  });

  describe('updateCommentsArray', () => {
    test('it should pass validation when supplied an array of comments', () => {
      const payload = getUpdateCommentsArrayMock();
      const decoded = updateCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should fail validation when undefined', () => {
      const payload = undefined;
      const decoded = updateCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "Array<({| comment: NonEmptyString |} & Partial<{| id: NonEmptyString |}>)>"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should fail validation when array includes non comments types', () => {
      const payload = [1] as unknown as UpdateCommentsArray;
      const decoded = updateCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<({| comment: NonEmptyString |} & Partial<{| id: NonEmptyString |}>)>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('updateCommentsArrayOrUndefined', () => {
    test('it should pass validation when supplied an array of comments', () => {
      const payload = getUpdateCommentsArrayMock();
      const decoded = updateCommentsArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should pass validation when supplied when undefined', () => {
      const payload = undefined;
      const decoded = updateCommentsArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should fail validation when array includes non comments types', () => {
      const payload = [1] as unknown as UpdateCommentsArrayOrUndefined;
      const decoded = updateCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<({| comment: NonEmptyString |} & Partial<{| id: NonEmptyString |}>)>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });
});
