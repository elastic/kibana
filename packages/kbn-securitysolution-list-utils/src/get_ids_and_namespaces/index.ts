/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExceptionListIdentifiers, NamespaceType } from '@kbn/securitysolution-io-ts-list-types';

export const getIdsAndNamespaces = ({
  lists,
}: {
  lists: ExceptionListIdentifiers[];
}): { ids: string[]; namespaces: NamespaceType[] } =>
  lists
    .filter((list) => list.type === 'detection')
    .reduce<{ ids: string[]; namespaces: NamespaceType[] }>(
      (acc, { listId, namespaceType }) => ({
        ids: [...acc.ids, listId],
        namespaces: [...acc.namespaces, namespaceType],
      }),
      { ids: [], namespaces: [] }
    );
