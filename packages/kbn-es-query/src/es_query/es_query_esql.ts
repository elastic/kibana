/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// retrieves the index pattern from the aggregate query
export function getIndexPatternFromESQLQuery(esql?: string): string {
  const splitFroms = esql?.split(new RegExp(/FROM\s/, 'ig'));
  const fromsLength = splitFroms?.length ?? 0;
  if (splitFroms && splitFroms?.length > 2) {
    esql = `${splitFroms[fromsLength - 2]} FROM ${splitFroms[fromsLength - 1]}`;
  }
  // case insensitive match for the index pattern
  const regex = new RegExp(/FROM\s+([\w*-.!@$^()~;]+)/, 'i');
  const matches = esql?.match(regex);
  if (matches) {
    return matches[1];
  }
  return '';
}
