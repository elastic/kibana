/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';

import { NonEmptyArray } from '@kbn/securitysolution-io-ts-types';

export const machine_learning_job_id_normalized = NonEmptyArray(t.string);
export type MachineLearningJobIdNormalized = t.TypeOf<typeof machine_learning_job_id_normalized>;

export const machineLearningJobIdNormalizedOrUndefined = t.union([
  machine_learning_job_id_normalized,
  t.undefined,
]);
export type MachineLearningJobIdNormalizedOrUndefined = t.TypeOf<
  typeof machineLearningJobIdNormalizedOrUndefined
>;
