/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { drilldownsComparators } from '@kbn/embeddable-plugin/common';
import type { SerializedStateComparison } from '@kbn/presentation-publishing';
import { timeRangeComparators, titleComparators } from '@kbn/presentation-publishing';
import type { VisualizeByReferenceState, VisualizeByValueState } from './types';

type VisualizeComparedState = VisualizeByReferenceState & VisualizeByValueState;

const omitEmptyValues = (value: unknown): unknown => {
  if (!value || Array.isArray(value) || typeof value !== 'object') return value;

  const entries = Object.entries(value);
  if (!entries.length) return undefined;

  return Object.fromEntries(
    entries
      .map(([key, entryValue]) => [key, omitEmptyValues(entryValue)])
      .filter(([, entryValue]) => entryValue)
  );
};

// By-value and by-reference keys never appear on the same state, so they compare equal when absent.
export const visualizeStateComparison: SerializedStateComparison<VisualizeComparedState> = {
  comparators: {
    ...drilldownsComparators,
    ...titleComparators,
    ...timeRangeComparators,
    savedObjectId: 'referenceEquality',
    uiState: 'deepEquality',
    savedVis: (a, b) => isEqual(omitEmptyValues(a), omitEmptyValues(b)),
  },
};
