/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getDocumentsById } from './get_doc_by_id';

export interface EsDocumentVersion {
  index: string;
  seqNo: number;
  primaryTerm: number;
}

export interface EsDocumentWithVersion<TDocument> {
  id: string;
  version: EsDocumentVersion;
  doc: TDocument;
}

/**
 * Extracts the OCC version (`index` / `seqNo` / `primaryTerm`) from a single
 * ES response item — either a bulk-response item (an `update` or `create`
 * action result) or a search hit (which requires `seq_no_primary_term: true`
 * on the search request). Returns `undefined` when the item errored or did not
 * include version metadata, so callers can safely skip failed items when
 * refreshing a version cache.
 */
export const extractVersionFromBulkItem = (
  op: estypes.BulkResponseItem | estypes.SearchHit | undefined
): { id: string; version: EsDocumentVersion } | undefined => {
  if (!op) {
    return undefined;
  }

  // Only bulk-response items carry an `error`; a search hit never does.
  if ('error' in op && op.error) {
    return undefined;
  }

  const { _id: id, _index: index, _seq_no: seqNo, _primary_term: primaryTerm } = op;

  if (!id || !index || seqNo === undefined || primaryTerm === undefined) {
    return undefined;
  }

  return {
    id,
    version: { index, seqNo, primaryTerm },
  };
};

export interface DocumentCreate<TDocument> {
  doc: TDocument;
}

export type DocumentVersionsById = Record<string, EsDocumentVersion>;

export const getEsDocumentVersion = ({
  index,
  seqNo,
  primaryTerm,
}: {
  index: string | undefined;
  seqNo: number | undefined;
  primaryTerm: number | undefined;
}): EsDocumentVersion => {
  if (index === undefined || seqNo === undefined || primaryTerm === undefined) {
    throw new Error('Elasticsearch response did not include document version metadata');
  }

  return { index, seqNo, primaryTerm };
};

export const resolveDocumentVersionsByIds = async <TDocument extends { id?: string }>({
  esClient,
  ids,
  writeIndex,
  dataStreamName,
  entityName,
}: {
  esClient: ElasticsearchClient;
  ids: string[];
  writeIndex: string;
  dataStreamName: string;
  entityName: string;
}): Promise<DocumentVersionsById> => {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) {
    return {};
  }

  const docs = await getDocumentsById<TDocument>({
    esClient,
    ids: uniqueIds,
    writeIndex,
    dataStreamName,
    entityName,
    sourceIncludes: ['id'],
  });

  const versions = Object.fromEntries(docs.map(({ id, version }) => [id, version]));
  const unresolvedIds = uniqueIds.filter((id) => !versions[id]);
  if (unresolvedIds.length > 0) {
    throw new Error(`${entityName}(s) not found for update: ${unresolvedIds.join(', ')}`);
  }

  return versions;
};
