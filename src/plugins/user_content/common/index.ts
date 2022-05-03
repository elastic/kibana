/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
export {
  API_BASE_PATH,
  metadataEventTypes,
  EVENTS_COUNT_GRANULARITY,
  userContentCommonMappings,
} from './constants';

export { withApiBaseBath } from './lib';

export type { MetadataEventType, UserContentMetadataEvent, ViewsCounters } from './types';
