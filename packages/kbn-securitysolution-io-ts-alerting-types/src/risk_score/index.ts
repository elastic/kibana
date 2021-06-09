/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the risk score as:
 *   - Natural Number (positive integer and not a float),
 *   - Between the values [0 and 100] inclusive.
 */
export const RiskScore = new t.Type<number, number, unknown>(
  'RiskScore',
  t.number.is,
  (input, context): Either<t.Errors, number> => {
    return typeof input === 'number' && Number.isSafeInteger(input) && input >= 0 && input <= 100
      ? t.success(input)
      : t.failure(input, context);
  },
  t.identity
);

export type RiskScoreC = typeof RiskScore;

export const risk_score = RiskScore;
export type RiskScore = t.TypeOf<typeof risk_score>;

export const riskScoreOrUndefined = t.union([risk_score, t.undefined]);
export type RiskScoreOrUndefined = t.TypeOf<typeof riskScoreOrUndefined>;
