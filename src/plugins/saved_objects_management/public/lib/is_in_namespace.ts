/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectWithMetadata } from '../types';

export const isInNamespace = (obj: SavedObjectWithMetadata, namespace: string): boolean => {
  const {
    namespaces: objNamespaces,
    meta: { namespaceType },
  } = obj;

  if (namespaceType === 'agnostic') {
    return true;
  }
  if (!objNamespaces) {
    return false;
  }
  if (namespaceType === 'single') {
    return objNamespaces[0] === namespace;
  }
  return objNamespaces.includes(namespace);
};
