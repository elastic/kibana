/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface RecommendedQuery {
  // The name of the recommended query, appears in the editor as a suggestion
  name: string;
  // The actual ESQL query string
  query: string;
}

interface ResolveIndexResponseItem {
  name: string;
}

export interface ResolveIndexResponse {
  indices?: ResolveIndexResponseItem[];
  aliases?: ResolveIndexResponseItem[];
  data_streams?: ResolveIndexResponseItem[];
}
