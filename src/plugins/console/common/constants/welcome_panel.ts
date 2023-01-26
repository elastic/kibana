/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const kibanaExample = `
# retrieve sets of saved objects 
POST kbn:api/saved_objects/_export
`;

export const multipleRequestsExample = `
# POST test_index/_doc/test_doc 200 OK
{
 "_index": "test_index",
 "_id": "test_doc",
 "_version": 3,
 "result": "updated",
 "_shards": {
   "total": 2,
   "successful": 1,
   "failed": 0
 },
 "_seq_no": 2,
 "_primary_term": 1
}
# POST notAnEndpoint 405 Method Not Allowed
{
 "error": "Incorrect HTTP method for uri [/notAnEndpoint?pretty=true] and method [POST], allowed: [HEAD, GET, PUT, DELETE]",
 "status": 405
}
`;

export const commentsExample = `
# This request searches all of your indices.
GET _search
{
 // The query parameter indicates query context.
 "query": {
   // Matches all documents.
   /*"match_all": {
     "boost": 1.2
   }*/
   "match_none": {} // Matches no document.
 }
}
`;

export const variablesExample = `
GET $\{pathVariable}
{
 "query": {
   "match": {
     "$\{bodyNameVariable}": "$\{bodyValueVariable}"
   }
 }
}
`;

export const keyboardShortcutsImageUrl =
  'https://images.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt3e9d63b81228222c/639ba8008f1f170dcb41233d/auto-ident-command.gif';
