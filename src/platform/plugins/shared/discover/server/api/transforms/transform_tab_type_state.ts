/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DiscoverTabType } from '@kbn/discover-utils';
import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import { isDiscoverSessionEsqlTab } from '../../../common/embeddable';
import {
  fromStoredMetricsTabTypeState,
  toStoredMetricsTabTypeState,
} from '../../../common/embeddable/transform_utils';
import type {
  DiscoverSessionApiClassicTab,
  DiscoverSessionApiEsqlTab,
  DiscoverSessionApiTab,
  DiscoverSessionApiTabTypeState,
} from '../schema';

type StoredTabTypeState = DiscoverSessionTabAttributes['tabTypeState'];
type TabWithoutTypeState =
  | Omit<DiscoverSessionApiClassicTab, 'type'>
  | Omit<DiscoverSessionApiEsqlTab, 'type'>;

export const transformTabTypeStateIn = (
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

export const transformTabTypeStateOut = (
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
