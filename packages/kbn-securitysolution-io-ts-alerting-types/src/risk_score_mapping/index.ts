/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { operator } from '@kbn/securitysolution-io-ts-types';
import { RiskScore } from '../risk_score';

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RiskScoreMappingItem = t.TypeOf<typeof RiskScoreMappingItem>;
export const RiskScoreMappingItem = t.exact(
  t.type({
    field: t.string,
    value: t.string,
    operator,
    risk_score: t.union([RiskScore, t.undefined]),
  })
);

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RiskScoreMapping = t.TypeOf<typeof RiskScoreMapping>;
export const RiskScoreMapping = t.array(RiskScoreMappingItem);
