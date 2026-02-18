/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pipe } from 'fp-ts/pipeable';
import { left } from 'fp-ts/Either';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import {
  getOutputDetailsSample,
  getOutputDetailsSampleWithActionConnectors,
  getOutputDetailsSampleWithExceptions,
} from './export_rules_details_schema.mock';
import type { ExportRulesDetails } from './export_rules_details_schema';
import { exportRulesDetailsWithExceptionsAndConnectorsSchema } from './export_rules_details_schema';

describe('exportRulesDetailsWithExceptionsAndConnectorsSchema', () => {
  test('it should validate export details response', () => {
    const payload = getOutputDetailsSample();
    const decoded = exportRulesDetailsWithExceptionsAndConnectorsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate export details with exceptions details response', () => {
    const payload = getOutputDetailsSampleWithExceptions();
    const decoded = exportRulesDetailsWithExceptionsAndConnectorsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate export details with action connectors details response', () => {
    const payload = getOutputDetailsSampleWithActionConnectors();
    const decoded = exportRulesDetailsWithExceptionsAndConnectorsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });
  test('it should strip out extra keys', () => {
    const payload: ExportRulesDetails & {
      extraKey?: string;
    } = getOutputDetailsSample();
    payload.extraKey = 'some extra key';
    const decoded = exportRulesDetailsWithExceptionsAndConnectorsSchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getOutputDetailsSample());
  });
});
