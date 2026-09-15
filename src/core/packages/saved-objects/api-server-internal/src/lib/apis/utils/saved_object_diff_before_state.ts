/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { SavedObjectsRawDocSource } from '@kbn/core-saved-objects-server';
import type { RepositoryEsClient } from '../../repository_es_client';
import { isMgetDoc } from './internal_utils';
import type { WriteAuditRecord } from './saved_object_audit_diff_recorder';

/** A saved object whose stored attributes should be recorded as audit before-state. */
export interface BeforeAttrsRequest {
  rawId: string;
  type: string;
  auditRecord: WriteAuditRecord | undefined;
}

/** Records `_source[type]` of each found doc as before-state on every request sharing its raw id. */
export function applyBeforeAttrsFromMgetDocs(
  docs: Array<estypes.MgetResponseItem<unknown>> | undefined,
  requests: BeforeAttrsRequest[]
): void {
  if (!docs || requests.length === 0) {
    return;
  }
  const requestsByRawId = new Map<string, BeforeAttrsRequest[]>();
  for (const req of requests) {
    requestsByRawId.set(req.rawId, [...(requestsByRawId.get(req.rawId) ?? []), req]);
  }
  for (const doc of docs) {
    if (!isMgetDoc(doc)) continue;
    for (const target of requestsByRawId.get(doc._id) ?? []) {
      const attrs = (doc._source as SavedObjectsRawDocSource | undefined)?.[target.type];
      if (attrs) {
        target.auditRecord?.setBefore(attrs as Record<string, unknown>);
      }
    }
  }
}

/** Fetches the requests' attributes in one mget (404s ignored) and records them as before-state. */
export async function fetchBeforeAttrs({
  client,
  getIndexForType,
  requests,
}: {
  client: RepositoryEsClient;
  getIndexForType: (type: string) => string;
  requests: BeforeAttrsRequest[];
}): Promise<void> {
  if (requests.length === 0) {
    return;
  }
  const response = await client.mget<SavedObjectsRawDocSource>(
    {
      docs: requests.map(({ rawId, type }) => ({
        _id: rawId,
        _index: getIndexForType(type),
        _source: [type],
      })),
    },
    { ignore: [404] }
  );
  applyBeforeAttrsFromMgetDocs(response.docs, requests);
}
