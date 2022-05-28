/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { Filter } from '@kbn/es-query';
import type { Query, RefreshInterval, TimeRange } from '@kbn/data-plugin/common';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import type { SavedVisState } from './types';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type VisualizeLocatorParams = {
  /**
   * The ID of the saved visualization to load.
   */
  visId?: string;

  /**
   * Global- and app-level filters to apply to data loaded by visualize.
   */
  filters?: Filter[];

  /**
   * Time range to apply to data loaded by visualize.
   */
  timeRange?: TimeRange;

  /**
   * How frequently to poll for data.
   */
  refreshInterval?: RefreshInterval;

  /**
   * The query to use in to load data in visualize.
   */
  query?: Query;

  /**
   * UI state to be passed on to the current visualization. This value is opaque from the perspective of visualize.
   */
  uiState?: SerializableRecord;

  /**
   * Serialized visualization.
   *
   * @note This is required to navigate to "create" page (i.e., when no `visId` has been provided).
   */
  vis?: SavedVisState;

  /**
   * Whether this visualization is linked a saved search.
   */
  linked?: boolean;

  /**
   * The saved search used as the source of the visualization.
   */
  savedSearchId?: string;

  /**
   * The saved search used as the source of the visualization.
   */
  indexPattern?: string;
};

export type VisualizeAppLocator = LocatorPublic<VisualizeLocatorParams>;

export const VISUALIZE_APP_LOCATOR = 'VISUALIZE_APP_LOCATOR';

export class VisualizeLocatorDefinition implements LocatorDefinition<VisualizeLocatorParams> {
  id = VISUALIZE_APP_LOCATOR;

  public async getLocation(params: VisualizeLocatorParams) {
    const { getLocation } = await import('./locator_location');
    return getLocation(params);
  }
}
