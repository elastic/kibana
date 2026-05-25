/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRecord } from '../is_record';
import type { RequestBodyIndex } from '../build_request_body_index';
import { collectComponentTightenings } from './collect_component_tightenings';
import { expandComponentTightenings } from './expand_component_tightenings';
import { collectInlineTightenings } from './collect_inline_tightenings';
import type { DetectionResult } from './types';

export { REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID } from './build_entry';
export type { DetectionResult } from './types';

export const detectAdditionalPropertiesTightening = (
  structuralDiff: unknown,
  requestBodyIndex: RequestBodyIndex
): DetectionResult => {
  if (!isRecord(structuralDiff)) return { entries: [], warnings: [] };

  const componentTightenings = collectComponentTightenings(structuralDiff);
  const componentExpansion = expandComponentTightenings(componentTightenings, requestBodyIndex);
  const inlineEntries = collectInlineTightenings(structuralDiff, componentExpansion.skipKeys);

  return {
    entries: [...componentExpansion.entries, ...inlineEntries],
    warnings: componentExpansion.warnings,
  };
};
