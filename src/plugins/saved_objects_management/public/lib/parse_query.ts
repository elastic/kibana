/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Query } from '@elastic/eui';
import type { SavedObjectManagementTypeInfo } from '../../common';

interface ParsedQuery {
  queryText?: string;
  visibleTypes?: string[];
  selectedTags?: string[];
}

enum FieldClause {
  TYPE = 'type',
  TAG = 'tag',
}
const fieldClauseValues: string[] = Object.values(FieldClause);

export function parseQuery(query: Query, typeInfos: SavedObjectManagementTypeInfo[]): ParsedQuery {
  let queryText: string | undefined;
  let visibleTypes: string[] | undefined;
  let selectedTags: string[] | undefined;

  if (query) {
    const termClauses = query.ast.getTermClauses();
    if (termClauses.length > 0) {
      queryText = termClauses.map(({ value }) => value).join(' ');
    }

    const typeFieldClauses = query.ast.getFieldClauses(FieldClause.TYPE);
    if (typeFieldClauses && typeFieldClauses.length > 0) {
      const displayNameToNameMap = typeInfos.reduce((map, typeInfo) => {
        map.set(typeInfo.displayName, typeInfo.name);
        return map;
      }, new Map<string, string>());
      const values = typeFieldClauses[0].value;
      const typeFieldClausesValues = Array.isArray(values) ? values : [values];
      visibleTypes = typeFieldClausesValues.map((typeInfo) => {
        typeInfo = typeInfo.toString();
        return displayNameToNameMap.get(typeInfo) ?? typeInfo;
      });
    }

    const tagFieldClauses = query.ast.getFieldClauses(FieldClause.TAG);
    if (tagFieldClauses && tagFieldClauses.length > 0) {
      const values = tagFieldClauses[0].value;
      const tagFieldClausesValues = Array.isArray(values) ? values : [values];
      selectedTags = tagFieldClausesValues.map((t) => {
        return t.toString();
      });
    }

    // check for unknown filters
    query.ast.getFieldClauses().forEach((clause) => {
      const { type: clauseType, field, value } = clause;
      if (clauseType === 'field' && !Array.isArray(value) && !fieldClauseValues.includes(field)) {
        // Unknown filters must be used as part of the search term.
        // Example: "remote:logs" is not a filter, it is a valid search term.
        queryText = `${queryText ?? ''} ${field}:${value}`;
      }
    });
  }

  return {
    queryText,
    visibleTypes,
    selectedTags,
  };
}
