/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DiscoverSessionApiEmbeddableByReferenceConfig,
  DiscoverSessionApiEmbeddableByValueConfig,
  DiscoverSessionApiEmbeddableTab,
} from '@kbn/as-code-discover-schema';
import type { StateComparators } from '@kbn/presentation-publishing';
import { isEqual, isUndefined, omitBy } from 'lodash';
import { areTableSettingOverridesEqual } from './panel_tab';

export function getDiscoverSessionEmbeddableComparators(
  isByValue: boolean,
  shouldSkipTabComparators: boolean,
  selectedSessionTab?: DiscoverSessionApiEmbeddableTab
): StateComparators<
  DiscoverSessionApiEmbeddableByValueConfig | DiscoverSessionApiEmbeddableByReferenceConfig
> {
  return isByValue
    ? {
        tabs: (prev, next) => {
          if (prev == null || next == null) return prev == null && next == null;
          if (prev.length !== next.length) return false;
          return prev.every((tab, i) =>
            isEqual(omitBy(prev[i], isUndefined), omitBy(next[i], isUndefined))
          );
        },
      }
    : {
        // While the selected tab is missing or inline editing is in progress,
        // skip tab-dependent comparators so unsaved-changes badges don't appear
        // until the user explicitly applies a tab change.
        selected_tab_id: shouldSkipTabComparators ? 'skip' : 'referenceEquality',
        ref_id: 'skip',
        // Overrides that show the same table on top of the selected session tab are equal
        overrides: (prev, next) =>
          areTableSettingOverridesEqual(selectedSessionTab ?? {}, prev, next),
      };
}
