/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SavedObjectsTypeMappingDefinition, SavedObjectsFieldMapping } from '@kbn/core/public';
import type { ViewsCounters } from './types';

export const API_BASE_PATH = '/api/user_content';

export const metadataEventTypes = ['viewed:kibana', 'viewed:api'] as const;

/** The **days** we want to aggregate events count */
export const EVENTS_COUNT_GRANULARITY = [7, 14, 30, 45, 60, 90] as const;

export const viewsCountRangeFields = EVENTS_COUNT_GRANULARITY.map(
  (days) => `views_${days}_days` as const
);

export const VIEWS_TOTAL_FIELD = 'views_total' as const;

const viewsCountMapping = [VIEWS_TOTAL_FIELD, ...viewsCountRangeFields].reduce((agg, field) => {
  return {
    ...agg,
    [field]: { type: 'integer' } as SavedObjectsFieldMapping,
  };
}, {} as SavedObjectsTypeMappingDefinition['properties']);

/** Common saved object mappings for all user generated content */
export const userContentCommonMappings = {
  ...viewsCountMapping,
};

const viewsCount = [VIEWS_TOTAL_FIELD, ...viewsCountRangeFields].reduce((agg, field) => {
  return {
    ...agg,
    [field]: 0,
  };
}, {} as ViewsCounters);

export const defaultUserContentAttributes = {
  ...viewsCount,
};
