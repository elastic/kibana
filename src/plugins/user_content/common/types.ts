/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MetadataEvent } from '@kbn/metadata-events-streams-plugin/common';

import { metadataEventTypes } from './constants';

export type MetadataEventType = typeof metadataEventTypes[number];

export interface UserContentMetadataEvent extends MetadataEvent<MetadataEventType> {
  data: {
    /** The saved object id */
    so_id: string;
    [key: string]: unknown;
  };
}
