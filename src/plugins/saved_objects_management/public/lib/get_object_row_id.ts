/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectWithMetadata } from '../types';

/**
 * Used by the SO listing table that requires an unique identifier per object / row.
 * This is required to handle listing objects that are namespaceType=single from multiple namespaces
 * @param obj
 */
export const getObjectRowIdentifier = (obj: SavedObjectWithMetadata): string => {
  if (obj.meta.namespaceType === 'single') {
    return `${obj.namespaces ? obj.namespaces[0] : 'default'}:${obj.id}`;
  }
  return obj.id;
};
