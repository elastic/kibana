/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface EsDocumentLocator {
  index: string;
  seqNo: number;
  primaryTerm: number;
}

export interface LocatedDocument<TDocument> {
  doc: TDocument;
  locator: EsDocumentLocator;
}

export interface DocumentCreate<TDocument> {
  doc: TDocument;
}

export interface DocumentUpdate<TDocument> {
  doc: TDocument;
  locator: EsDocumentLocator;
}

export type DocumentLocatorsById = Record<string, EsDocumentLocator>;

export const getEsDocumentLocator = ({
  index,
  seqNo,
  primaryTerm,
}: {
  index: string | undefined;
  seqNo: number | undefined;
  primaryTerm: number | undefined;
}): EsDocumentLocator => {
  if (index === undefined || seqNo === undefined || primaryTerm === undefined) {
    throw new Error('Elasticsearch response did not include document locator metadata');
  }

  return { index, seqNo, primaryTerm };
};
