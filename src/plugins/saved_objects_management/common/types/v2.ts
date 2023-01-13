/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectWithMetadataV1 } from './v1';

export interface SavedObjectMetadataV2 extends SavedObjectWithMetadataV1 {
  isManaged: boolean;
}

/**
 * See documentation for {@link BulkGetHTTPResponseV1}
 */
export interface BulkGetHTTPResponseV2 {
  objects: SavedObjectMetadataV2[];
}
