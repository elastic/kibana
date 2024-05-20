/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { getExceptionExportDetailsMock } from './index.mock';
import { exportExceptionDetailsSchema, ExportExceptionDetails } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('exportExceptionDetails', () => {
  test('it should validate export meta', () => {
    const payload = getExceptionExportDetailsMock();
    const decoded = exportExceptionDetailsSchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should strip out extra keys', () => {
    const payload: ExportExceptionDetails & {
      extraKey?: string;
    } = getExceptionExportDetailsMock();
    payload.extraKey = 'some extra key';
    const decoded = exportExceptionDetailsSchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getExceptionExportDetailsMock());
  });
});
