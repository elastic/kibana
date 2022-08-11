/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewsService } from '@kbn/data-views-plugin/common';
import { AbstractSearchStrategy } from './abstract_search_strategy';
import { DefaultSearchCapabilities } from '../capabilities/default_search_capabilities';

import type { FetchedIndexPattern } from '../../../../common/types';
import type {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesRequest,
} from '../../../types';
import { UI_SETTINGS } from '../../../../common/constants';

export class DefaultSearchStrategy extends AbstractSearchStrategy {
  async checkForViability(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesRequest
  ) {
    const uiSettings = (await requestContext.core).uiSettings.client;

    return {
      isViable: true,
      capabilities: new DefaultSearchCapabilities({
        panel: req.body.panels ? req.body.panels[0] : null,
        timezone: req.body.timerange?.timezone,
        maxBucketsLimit: await uiSettings.get(UI_SETTINGS.MAX_BUCKETS_SETTING),
      }),
    };
  }

  async getFieldsForWildcard(
    fetchedIndexPattern: FetchedIndexPattern,
    indexPatternsService: DataViewsService,
    capabilities?: unknown
  ) {
    return super.getFieldsForWildcard(fetchedIndexPattern, indexPatternsService, capabilities);
  }
}
