/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { left } from 'fp-ts/lib/Either';
import { ImportQuerySchema, importQuerySchema } from '.';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('importQuerySchema', () => {
  test('it should validate proper schema', () => {
    const payload = {
      overwrite: true,
    };
    const decoded = importQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate a non boolean value for "overwrite"', () => {
    const payload: Omit<ImportQuerySchema, 'overwrite'> & { overwrite: string } = {
      overwrite: 'wrong',
    };
    const decoded = importQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "wrong" supplied to "overwrite"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT allow an extra key to be sent in', () => {
    const payload: ImportQuerySchema & {
      extraKey?: string;
    } = {
      extraKey: 'extra',
      overwrite: true,
    };

    const decoded = importQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
