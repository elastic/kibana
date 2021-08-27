/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';

export type ObjectKey = string;

export const getObjKey = (
  obj: { type: string; id: string; namespaces?: string[] },
  typeRegistry: ISavedObjectTypeRegistry,
  currentNamespace?: string
): ObjectKey => {
  if (typeRegistry.isSingleNamespace(obj.type)) {
    const namespace = obj.namespaces ? obj.namespaces[0] : currentNamespace;
    return `${namespace ? `${namespace}:` : ''}${obj.type}:${obj.id}`;
  }
  return `${obj.type}:${obj.id}`;
};
