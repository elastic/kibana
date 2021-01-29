/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Query } from '@elastic/eui';

interface ParsedQuery {
  queryText?: string;
  visibleTypes?: string[];
  selectedTags?: string[];
}

export function parseQuery(query: Query): ParsedQuery {
  let queryText: string | undefined;
  let visibleTypes: string[] | undefined;
  let selectedTags: string[] | undefined;

  if (query) {
    if (query.ast.getTermClauses().length) {
      queryText = query.ast
        .getTermClauses()
        .map((clause: any) => clause.value)
        .join(' ');
    }
    if (query.ast.getFieldClauses('type')) {
      visibleTypes = query.ast.getFieldClauses('type')[0].value as string[];
    }
    if (query.ast.getFieldClauses('tag')) {
      selectedTags = query.ast.getFieldClauses('tag')[0].value as string[];
    }
  }

  return {
    queryText,
    visibleTypes,
    selectedTags,
  };
}
