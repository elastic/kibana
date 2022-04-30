/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { ImportCommentsArray } from '../import_comment';
import { DefaultImportCommentsArray } from '../default_import_comments_array';
import { getCommentsArrayMock } from '../comment/index.mock';
import { getCreateCommentsArrayMock } from '../create_comment/index.mock';

describe('default_import_comments_array', () => {
  test('it should pass validation when supplied an empty array', () => {
    const payload: ImportCommentsArray = [];
    const decoded = DefaultImportCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should pass validation when supplied an array of comments', () => {
    const payload: ImportCommentsArray = getCommentsArrayMock();
    const decoded = DefaultImportCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should pass validation when supplied an array of new comments', () => {
    const payload: ImportCommentsArray = getCreateCommentsArrayMock();
    const decoded = DefaultImportCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should pass validation when supplied an array of new and existing comments', () => {
    const payload: ImportCommentsArray = [
      ...getCommentsArrayMock(),
      ...getCreateCommentsArrayMock(),
    ];
    const decoded = DefaultImportCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should fail validation when supplied an array of numbers', () => {
    const payload = [1];
    const decoded = DefaultImportCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1" supplied to "DefaultImportComments"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should fail validation when supplied an array of strings', () => {
    const payload = ['some string'];
    const decoded = DefaultImportCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "DefaultImportComments"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default array entry', () => {
    const payload = null;
    const decoded = DefaultImportCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });
});
