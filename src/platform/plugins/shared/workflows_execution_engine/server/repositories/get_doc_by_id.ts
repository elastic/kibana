/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsDocumentVersion } from './document_version';

export interface VersionedDocument<TDocument> {
  id: string;
  doc: TDocument;
  version: EsDocumentVersion;
}

const getDocumentVersion = ({
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

export const getDocumentsById = async <TDocument extends { id?: string }>({
  esClient,
  ids,
  writeIndex,
  dataStreamName,
  sourceIncludes,
  sourceExcludes,
  entityName,
}: {
  esClient: ElasticsearchClient;
  ids: string[];
  writeIndex: string;
  dataStreamName: string;
  sourceIncludes?: string[];
  sourceExcludes?: string[];
  entityName: string;
}): Promise<Array<VersionedDocument<TDocument>>> => {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) {
    return [];
  }

  const docsById = new Map<string, VersionedDocument<TDocument>>();
  const addDocument = ({
    id,
    doc,
    version,
  }: {
    id: string;
    doc: TDocument;
    version: EsDocumentVersion;
  }) => {
    if (docsById.has(id)) {
      throw new Error(`Found duplicate ${entityName} ID ${id} in multiple backing indices`);
    }
    docsById.set(id, { id, doc, version });
  };

  const mgetResponse = await esClient.mget<TDocument>({
    index: writeIndex,
    ids: uniqueIds,
    ...(sourceIncludes?.length ? { _source_includes: sourceIncludes } : {}),
    ...(sourceExcludes?.length ? { _source_excludes: sourceExcludes } : {}),
  });

  for (const doc of mgetResponse.docs) {
    if ('found' in doc && doc.found && doc._source) {
      const id = doc._id;
      if (!id) {
        throw new Error('Elasticsearch mget response did not include document ID');
      }
      addDocument({
        id,
        doc: doc._source,
        version: getDocumentVersion({
          index: doc._index,
          seqNo: doc._seq_no,
          primaryTerm: doc._primary_term,
        }),
      });
    }
  }

  const missingIds = uniqueIds.filter((id) => !docsById.has(id));
  if (missingIds.length > 0) {
    const searchResponse = await esClient.search<TDocument>({
      index: dataStreamName,
      seq_no_primary_term: true,
      query: { ids: { values: missingIds } },
      size: Math.min(missingIds.length, 10000),
      ...(sourceIncludes?.length ? { _source_includes: sourceIncludes } : {}),
      ...(sourceExcludes?.length ? { _source_excludes: sourceExcludes } : {}),
    });

    for (const hit of searchResponse.hits.hits) {
      if (hit._source) {
        const id = hit._id ?? hit._source.id;
        if (!id) {
          throw new Error('Elasticsearch search response did not include document ID');
        }
        addDocument({
          id,
          doc: hit._source,
          version: getDocumentVersion({
            index: hit._index,
            seqNo: hit._seq_no,
            primaryTerm: hit._primary_term,
          }),
        });
      }
    }
  }

  return uniqueIds.flatMap((id) => {
    const doc = docsById.get(id);
    return doc ? [doc] : [];
  });
};
