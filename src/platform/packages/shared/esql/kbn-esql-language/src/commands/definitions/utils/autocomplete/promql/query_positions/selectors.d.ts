/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ESQLControlVariable } from '@kbn/esql-types';
import type { ISuggestionItem } from '../../../../../registry/types';
import type { PromqlDetailedPosition } from '../types';
/** Suggests selector/range/operator tokens after a metric name. */
export declare const suggestMetrics: (position: PromqlDetailedPosition) => ISuggestionItem[];
/** Suggests the next token after a closed label selector. */
export declare const suggestAfterLabelSelector: (
  position: PromqlDetailedPosition
) => ISuggestionItem[];
/** Suggests label matcher operators after a label name. */
export declare const suggestLabelMatchers: () => ISuggestionItem[];
/** Suggests placeholder values and control variables after a label matcher operator. */
export declare const suggestLabelValues: (
  variables?: ESQLControlVariable[],
  supportsControls?: boolean
) => ISuggestionItem[];
/** Suggests PromQL duration snippets for range selector contexts. */
export declare const suggestTimeDurations: () => ISuggestionItem[];
