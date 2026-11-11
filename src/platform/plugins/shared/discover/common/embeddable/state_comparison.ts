/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual, isUndefined, omit, omitBy } from 'lodash';
import type { SerializedStateComparison } from '@kbn/presentation-publishing';
import {
  byValueComparator,
  timeRangeComparators,
  titleComparators,
} from '@kbn/presentation-publishing';
import { drilldownsComparators } from '@kbn/embeddable-plugin/common';
import type {
  DiscoverSessionEmbeddableByReferenceState,
  DiscoverSessionEmbeddableByValueState,
} from './types';

type DiscoverSessionEmbeddableComparedState = DiscoverSessionEmbeddableByValueState &
  DiscoverSessionEmbeddableByReferenceState;

type Tabs = DiscoverSessionEmbeddableComparedState['tabs'];
type Overrides = DiscoverSessionEmbeddableComparedState['overrides'];

const OVERRIDE_KEYS_WITH_EMPTY_DEFAULTS = ['column_order', 'column_settings', 'sort'] as const;

const areTabsEqual = (prev: Tabs | undefined, next: Tabs | undefined): boolean => {
  if (prev == null || next == null) return prev == null && next == null;
  if (prev.length !== next.length) return false;
  return prev.every((tab, i) => isEqual(omitBy(tab, isUndefined), omitBy(next[i], isUndefined)));
};

const areOverridesEqual = (prev: Overrides = {}, next: Overrides = {}): boolean =>
  isEqual(prev.column_order ?? [], next.column_order ?? []) &&
  isEqual(prev.column_settings ?? {}, next.column_settings ?? {}) &&
  isEqual(prev.sort ?? [], next.sort ?? []) &&
  isEqual(
    omit(prev, OVERRIDE_KEYS_WITH_EMPTY_DEFAULTS),
    omit(next, OVERRIDE_KEYS_WITH_EMPTY_DEFAULTS)
  );

// By-reference keys are absent from by-value states, so they compare equal there.
export const discoverSessionEmbeddableStateComparison: SerializedStateComparison<DiscoverSessionEmbeddableComparedState> =
  {
    comparators: {
      ...drilldownsComparators,
      ...titleComparators,
      ...timeRangeComparators,
      tabs: byValueComparator(areTabsEqual),
      ref_id: 'referenceEquality',
      selected_tab_id: 'referenceEquality',
      overrides: areOverridesEqual,
    },
  };
