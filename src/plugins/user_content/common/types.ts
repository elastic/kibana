/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MetadataEvent } from '@kbn/metadata-events-streams-plugin/common';

import { metadataEventTypes, viewsCountRangeFields, VIEWS_TOTAL_FIELD } from './constants';

/** The allowed event types to be registered in the stream */
export type MetadataEventType = typeof metadataEventTypes[number];

/** The metadata event indexed in the stream */
export interface UserContentMetadataEvent extends MetadataEvent<MetadataEventType> {
  data: {
    /** The saved object id */
    so_id: string;
    /** The saved object type */
    so_type: string;
    [key: string]: unknown;
  };
}

export interface ViewsCounters {
  [daysRange: string]: number;
}

export type ViewsCountRangeField = typeof viewsCountRangeFields[number] | typeof VIEWS_TOTAL_FIELD;
