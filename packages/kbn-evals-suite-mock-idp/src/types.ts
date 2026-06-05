/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Example, EvaluationCriterion } from '@kbn/evals';

export interface RoleGenerationInput {
  description: string;
  projectType?: string;
}

export interface RoleGenerationOutput {
  roleName: string;
  kibana: Array<{ id: string; access: string; space: string }>;
  elasticsearch: Array<{ index: string; access: string }>;
  accessToSystemIndices: string;
  error?: string;
}

export interface RoleGenerationMetadata extends Record<string, unknown> {
  /** Criteria the generated role must satisfy — passed to the LLM judge */
  criteria: EvaluationCriterion[];
}

export type RoleGenerationExample = Example<
  Record<string, unknown>,
  RoleGenerationOutput,
  RoleGenerationMetadata
>;
