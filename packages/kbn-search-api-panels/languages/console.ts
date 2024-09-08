/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LanguageDefinition } from '../types';

const INDEX_NAME_PLACEHOLDER = 'index_name';

export const consoleDefinition: Partial<LanguageDefinition> = {
  buildSearchQuery: `POST /books/_search?pretty
{
  "query": {
    "query_string": {
      "query": "snow"
    }
  }
}`,
  ingestData: ({ ingestPipeline }) => `POST _bulk?pretty${
    ingestPipeline ? `&pipeline=${ingestPipeline}` : ''
  }
{ "index" : { "_index" : "books" } }
{"name": "Snow Crash", "author": "Neal Stephenson", "release_date": "1992-06-01", "page_count": 470}
{ "index" : { "_index" : "books" } }
{"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585}
{ "index" : { "_index" : "books" } }
{"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328}
{ "index" : { "_index" : "books" } }
{"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227}
{ "index" : { "_index" : "books" } }
{"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268}
{ "index" : { "_index" : "books" } }
{"name": "The Handmaid's Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311}`,
  ingestDataIndex: ({ indexName }) => `POST _bulk?pretty
{ "index" : { "_index" : "${indexName ?? INDEX_NAME_PLACEHOLDER}" } }
{"name": "foo", "title": "bar"}
`,
};
