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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type VisualizeLocatorParams = {
  visId?: string;

  type?: string;

  filters?: Filter[];

  timeRange?: TimeRange;

  refreshInterval?: RefreshInterval;

  query?: Query;

  uiState?: SerializableRecord;

  vis?: SerializableRecord;

  forceNow?: string;

  searchSourceFields?: SerializableRecord;

  linked?: boolean;
};

export type VisualizeAppLocator = LocatorPublic<VisualizeLocatorParams>;

export const VISUALIZE_APP_LOCATOR = 'VISUALIZE_APP_LOCATOR';

export class VisualizeLocatorDefinition implements LocatorDefinition<VisualizeLocatorParams> {
  constructor(private readonly deps: { useHash: boolean }) {}

  id = VISUALIZE_APP_LOCATOR;

  public async getLocation(params: VisualizeLocatorParams) {
    let path = params.visId
      ? `#${VisualizeConstants.EDIT_PATH}/${params.visId}`
      : `#${VisualizeConstants.CREATE_PATH}`;

    path = params.type ? `${path}?type=${params.type}` : path;

    path = setStateToKbnUrl(
      '_a',
      omitBy(
        {
          linked: params.linked,
          time: params.timeRange,
          filters: params.filters?.filter((f) => !esFilters.isFilterPinned(f)),
          uiState: params.uiState,
          query: params.query,
          vis: params.vis,
          refreshInterval: params.refreshInterval,
        },
        (v) => v == null
      ),
      { useHash: this.deps.useHash },
      path
    );

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
      { useHash: this.deps.useHash },
      path
    );

    return {
      app: VisualizeConstants.APP_ID,
      path,
      state: {},
    };
  }
}
