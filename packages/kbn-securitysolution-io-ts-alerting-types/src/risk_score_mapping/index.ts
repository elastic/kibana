/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import { operator } from '@kbn/securitysolution-io-ts-types';
import { riskScoreOrUndefined } from '../risk_score';

export const risk_score_mapping_field = t.string;
export const risk_score_mapping_value = t.string;
export const risk_score_mapping_item = t.exact(
  t.type({
    field: risk_score_mapping_field,
    value: risk_score_mapping_value,
    operator,
    risk_score: riskScoreOrUndefined,
  })
);

export const risk_score_mapping = t.array(risk_score_mapping_item);
export type RiskScoreMapping = t.TypeOf<typeof risk_score_mapping>;

export const riskScoreMappingOrUndefined = t.union([risk_score_mapping, t.undefined]);
export type RiskScoreMappingOrUndefined = t.TypeOf<typeof riskScoreMappingOrUndefined>;
