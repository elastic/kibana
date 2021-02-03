/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export { createCreateIndexStream } from './create_index_stream';
export { createDeleteIndexStream } from './delete_index_stream';
export { createGenerateIndexRecordsStream } from './generate_index_records_stream';
export {
  migrateKibanaIndex,
  deleteKibanaIndices,
  cleanKibanaIndices,
  createDefaultSpace,
} from './kibana_index';
