/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';

interface ObjectIdentifierTuple {
  type: string;
  id: string;
  namespaces?: string[];
}

export type ObjectKeyProvider = (obj: ObjectIdentifierTuple) => string;

export const getObjectKeyProvider = ({
  typeRegistry,
  namespace,
  useObjectNamespaces,
  useProvidedNamespace,
}: {
  typeRegistry: ISavedObjectTypeRegistry;
  namespace?: string;
  useObjectNamespaces: boolean;
  useProvidedNamespace: boolean;
}): ObjectKeyProvider => {
  return (obj) => {
    return getObjKey(
      useObjectNamespaces ? obj : { ...obj, namespaces: undefined },
      typeRegistry,
      useProvidedNamespace ? namespace : undefined
    );
  };
};

export const getObjKey = (
  obj: { type: string; id: string; namespaces?: string[] },
  typeRegistry: ISavedObjectTypeRegistry,
  currentNamespace?: string
): string => {
  if (typeRegistry.isSingleNamespace(obj.type)) {
    const namespace = obj.namespaces ? obj.namespaces[0] : currentNamespace;
    return `${namespace ? `${namespace}:` : ''}${obj.type}:${obj.id}`;
  }
  return `${obj.type}:${obj.id}`;
};
