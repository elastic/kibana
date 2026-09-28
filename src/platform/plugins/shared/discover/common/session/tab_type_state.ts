/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DiscoverTabType } from '@kbn/discover-session-constants';
import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import type {
  DiscoverSessionApiClassicTab,
  DiscoverSessionApiEsqlTab,
  DiscoverSessionApiTab,
  DiscoverSessionApiTabTypeState,
} from '@kbn/as-code-discover-schema';
import {
  fromStoredMetricsTabTypeState,
  toStoredMetricsTabTypeState,
} from '../embeddable/transform_utils';
import { isDiscoverSessionEsqlTab } from '../embeddable';

type StoredTabTypeState = DiscoverSessionTabAttributes['tabTypeState'];
type TabWithoutTypeState =
  | Omit<DiscoverSessionApiClassicTab, 'type'>
  | Omit<DiscoverSessionApiEsqlTab, 'type'>;

/** Converts API tab settings to saved state; default tabs have no type-specific state. */
export const fromApiTabTypeState = (
  apiTabTypeState: DiscoverSessionApiTabTypeState
): StoredTabTypeState => {
  switch (apiTabTypeState.type) {
    case DiscoverTabType.Default:
      // Default tabs have no tabTypeState in the saved object.
      return undefined;
    case DiscoverTabType.Metrics:
      return toStoredMetricsTabTypeState(apiTabTypeState);
  }
};

/** Adds saved tab settings to the API tab, rejecting Metrics settings on a non-ES|QL tab. */
export const toApiTabTypeState = (
  apiTab: TabWithoutTypeState,
  tabTypeState: StoredTabTypeState
): DiscoverSessionApiTab => {
  switch (tabTypeState?.type) {
    case undefined:
      // The API always includes a type, using default when the saved object has no tabTypeState.
      return { ...apiTab, type: DiscoverTabType.Default };
    case DiscoverTabType.Metrics:
      if (!isDiscoverSessionEsqlTab(apiTab)) {
        throw new Error(
          `Metrics tab "${apiTab.label}" with ID "${apiTab.id}" requires an ES|QL data source.`
        );
      }

      return { ...apiTab, ...fromStoredMetricsTabTypeState(tabTypeState) };
  }
};
