/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import { validateKeysAllowed, validateRecordMaxKeys } from './validators';

const ctx = {
  addIssue: jest.fn(),
} as unknown as z.RefinementCtx;

describe('validators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('validateRecordMaxKeys', () => {
    it('does not add error if the keys of the record are less than the maximum', () => {
      validateRecordMaxKeys({
        record: { foo: 'bar' },
        ctx,
        maxNumberOfFields: 2,
        fieldName: 'myFieldName',
      });
      expect(ctx.addIssue).not.toHaveBeenCalled();
    });

    it('adds error if the keys of the record are greater than the maximum', () => {
      validateRecordMaxKeys({
        record: { foo: 'bar', bar: 'test', test: 'foo' },
        ctx,
        maxNumberOfFields: 2,
        fieldName: 'myFieldName',
      });
      expect(ctx.addIssue).toHaveBeenCalledTimes(1);
      expect(ctx.addIssue).toHaveBeenNthCalledWith(1, {
        code: 'custom',
        message: 'A maximum of 2 fields in myFieldName can be defined at a time.',
      });
    });
  });

  describe('validateKeysAllowed', () => {
    it('does not add erorr if the keys are allowed', () => {
      validateKeysAllowed({
        key: 'foo',
        ctx,
        disallowList: ['bar'],
        fieldName: 'myFieldName',
      });
      expect(ctx.addIssue).not.toHaveBeenCalled();
    });

    it('adds  error if the keys are not allowed', () => {
      validateKeysAllowed({
        key: 'foo',
        ctx,
        disallowList: ['foo'],
        fieldName: 'myFieldName',
      });

      expect(ctx.addIssue).toHaveBeenCalledTimes(1);
      expect(ctx.addIssue).toHaveBeenNthCalledWith(1, {
        code: 'custom',
        message: 'The following properties cannot be defined inside myFieldName: foo.',
      });
    });
  });
});
