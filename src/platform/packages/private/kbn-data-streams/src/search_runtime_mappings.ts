/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// For example:
// interface SearchRuntimeMappingsHelpers {
//   remap: (args: {
//     previousFieldName: string;
//     fieldName: string;
//     type: api.MappingRuntimeFieldType;
//   }) => api.MappingRuntimeField;
// }

// Could be used like:
// const searchRuntimeMappings = {
//   someFieldV2: searchRuntimeHelpers.remap({
//     previousFieldName: 'someField',
//     fieldName: 'someFieldV2',
//     type: 'keyword',
//   }),
//   // full declaration
//   someFieldV3: {
//     type: 'keyword',
//     script: {
//       source: `
//   // return what we have in source if there is something in source
//   if (params._source["someFieldV2"] != null) {
//     emit(params._source["someFieldV2"]);
//   } else  { // return the original value
//     emit(doc['someField'].value);
//   }
// `,
//     },
//   },
// } satisfies BaseSearchRuntimeMappings;
