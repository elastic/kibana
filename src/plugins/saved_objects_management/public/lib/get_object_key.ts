/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsNamespaceType } from 'src/core/public';

interface SavedObjectWithMetaLike {
  id: string;
  type: string;
  namespaces?: string[];
  meta: {
    namespaceType?: SavedObjectsNamespaceType;
  };
}

/**
 * Used to generate an unique object key, even when working with objects from different namespaces.
 * This is very close to the `rawId` implementation, but not meant to be an equivalent.
 */
export const getObjectKey = (obj: SavedObjectWithMetaLike): string => {
  const prefix =
    obj.meta.namespaceType === 'single' && obj.namespaces?.length ? `${obj.namespaces[0]}:` : '';
  return `${prefix}${obj.type}:${obj.id}`;
};
