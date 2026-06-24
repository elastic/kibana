/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface EsDocumentVersion {
  seqNo: number;
  primaryTerm: number;
}

export interface VersionedDocument<TDocument> {
  doc: TDocument;
  version: EsDocumentVersion;
}

export interface DocumentWrite<TDocument> {
  doc: TDocument;
  targetIndex?: string;
  ifVersion?: EsDocumentVersion;
}

export type DocumentVersionsById = Record<string, EsDocumentVersion>;

export const getEsDocumentVersion = ({
  seqNo,
  primaryTerm,
}: {
  seqNo: number | undefined;
  primaryTerm: number | undefined;
}): EsDocumentVersion => {
  if (seqNo === undefined || primaryTerm === undefined) {
    throw new Error('Elasticsearch response did not include document version metadata');
  }

  return { seqNo, primaryTerm };
};
