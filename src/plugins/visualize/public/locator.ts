/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { omitBy } from 'lodash';

import type { LocatorDefinition, LocatorPublic } from 'src/plugins/share/common';
import type { Filter, TimeRange, RefreshInterval, Query } from 'src/plugins/data/public';
import { esFilters } from '../../data/public';
import { setStateToKbnUrl } from '../../kibana_utils/public';

import { VisualizeConstants } from './application/visualize_constants';

import type { PureVisState } from './application/types';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type VisualizeLocatorParams = {
  /**
   * The ID of the saved visualization to load.
   */
  visId?: string;

  /**
   * Type of visualization.
   *
   * @note This is required to navigate to "create" page (i.e., when no `visId` has been provided).
   */
  type?: string;

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
   */
  vis?: PureVisState;

  /**
   * Whether this visualization is linked a saved search.
   */
  linked?: boolean;
};

export type VisualizeAppLocator = LocatorPublic<VisualizeLocatorParams>;

export const VISUALIZE_APP_LOCATOR = 'VISUALIZE_APP_LOCATOR';

export class VisualizeLocatorDefinition implements LocatorDefinition<VisualizeLocatorParams> {
  id = VISUALIZE_APP_LOCATOR;

  public async getLocation(params: VisualizeLocatorParams) {
    let path = params.visId
      ? `#${VisualizeConstants.EDIT_PATH}/${params.visId}`
      : `#${VisualizeConstants.CREATE_PATH}`;

    path = params.type ? `${path}?type=${params.type}` : path;

    path = setStateToKbnUrl(
      '_g',
      omitBy(
        {
          time: params.timeRange,
          filters: params.filters?.filter((f) => esFilters.isFilterPinned(f)),
          refreshInterval: params.refreshInterval,
        },
        (v) => v == null
      ),
      { useHash: false },
      path
    );

    path = setStateToKbnUrl(
      '_a',
      omitBy(
        {
          linked: params.linked,
          filters: params.filters?.filter((f) => !esFilters.isFilterPinned(f)),
          uiState: params.uiState,
          query: params.query,
          vis: params.vis,
        },
        (v) => v == null
      ),
      { useHash: false },
      path
    );

    return {
      app: VisualizeConstants.APP_ID,
      path,
      state: {},
    };
  }
}
