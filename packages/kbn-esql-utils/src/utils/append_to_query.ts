/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Append in a new line the appended text to take care of the case where the user adds a comment at the end of the query
// in these cases a base query such as "from index // comment" will result in errors or wrong data if we don't append in a new line
export function appendToESQLQuery(baseESQLQuery: string, appendedText: string): string {
  return `${baseESQLQuery}\n${appendedText}`;
}
