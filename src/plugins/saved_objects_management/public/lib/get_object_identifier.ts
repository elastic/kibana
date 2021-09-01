/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectWithMetadata } from '../../common';

export interface ObjectIdentifier {
  type: string;
  id: string;
  namespace?: string;
}

export const getObjectIdentifier = (
  { type, id, namespaces, meta: { namespaceType } }: SavedObjectWithMetadata,
  activeSpace?: string
) => {
  let namespace: string | undefined;

  if (activeSpace) {
    if (namespaceType === 'single') {
      namespace = namespaces ? namespaces[0] : undefined;
    } else if (namespaceType !== 'agnostic') {
      const potentialSpaces = namespaces ?? [];
      if (potentialSpaces.includes(activeSpace)) {
        namespace = activeSpace;
      } else {
        namespace = potentialSpaces[0];
      }
    }
  }

  return {
    type,
    id,
    namespace,
  };
};
