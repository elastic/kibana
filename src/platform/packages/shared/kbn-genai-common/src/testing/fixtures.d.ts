/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GenAiMessage } from '../genai/types';
export interface GenAiFieldFixture {
  source: Record<string, unknown>;
  expectedMessages: GenAiMessage[];
}
export declare const GEN_AI_INPUT_FIELD_FIXTURES: Record<string, GenAiFieldFixture>;
export declare const GEN_AI_OUTPUT_FIELD_FIXTURES: Record<string, GenAiFieldFixture>;
