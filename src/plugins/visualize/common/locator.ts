/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord, Serializable } from '@kbn/utility-types';
import { omitBy } from 'lodash';
import type { ParsedQuery } from 'query-string';
import { stringify } from 'query-string';
import rison from 'rison-node';
import type { Filter, Query, RefreshInterval, TimeRange } from 'src/plugins/data/common';
import type { LocatorDefinition, LocatorPublic } from 'src/plugins/share/common';
import { isFilterPinned } from '../../data/common';
import { url } from '../../kibana_utils/common';
import { GLOBAL_STATE_STORAGE_KEY, STATE_STORAGE_KEY, VisualizeConstants } from './constants';
import { PureVisState } from './types';

const removeEmptyKeys = (o: Record<string, Serializable>): Record<string, Serializable> =>
  omitBy(o, (v) => v == null);

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
  vis?: PureVisState;

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

  public async getLocation({
    visId,
    timeRange,
    filters,
    refreshInterval,
    linked,
    uiState,
    query,
    vis,
    savedSearchId,
    indexPattern,
  }: VisualizeLocatorParams) {
    let path = visId
      ? `#${VisualizeConstants.EDIT_PATH}/${visId}`
      : `#${VisualizeConstants.CREATE_PATH}`;

    const urlState: ParsedQuery = {
      [GLOBAL_STATE_STORAGE_KEY]: rison.encode(
        removeEmptyKeys({
          time: timeRange,
          filters: filters?.filter((f) => isFilterPinned(f)),
          refreshInterval,
        })
      ),
      [STATE_STORAGE_KEY]: rison.encode(
        removeEmptyKeys({
          linked,
          filters: filters?.filter((f) => !isFilterPinned(f)),
          uiState,
          query,
          vis,
        })
      ),
    };

    path += `?${stringify(url.encodeQuery(urlState), { encode: false, sort: false })}`;

    const otherParams = stringify({ type: vis?.type, savedSearchId, indexPattern });

    if (otherParams) path += `&${otherParams}`;

    return {
      app: VisualizeConstants.APP_ID,
      path,
      state: {},
    };
  }
}
