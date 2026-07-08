/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';

// Normalized LLM token usage. Shared between the step-execution mapping (per-step
// usage extracted from `output.metadata.usage`) and the execution mapping (the
// aggregated per-execution total). Present only for token-consuming (`ai.*`) steps.
export const TOKEN_USAGE_MAPPING: MappingProperty = {
  type: 'object',
  properties: {
    inputTokens: { type: 'long' },
    outputTokens: { type: 'long' },
    cachedTokens: { type: 'long' },
    totalTokens: { type: 'long' },
  },
};
