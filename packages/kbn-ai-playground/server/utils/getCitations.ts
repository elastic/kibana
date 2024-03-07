/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Document } from '@langchain/core/documents';

export function getCitations(
  answer: string,
  citationStyle: 'inline' | 'footnote',
  docs: Document[]
) {
  const gatheredCitations = answer.match(/\[\d+\]/g);
  if (!gatheredCitations) return [];

  return docs.filter((doc, i) => {
    return gatheredCitations.some((citation) => {
      return i + 1 === parseInt(citation.slice(1, -1));
    });
  });
}
