/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  createIndexDocRecordsStream,
  createGenerateDocRecordsStream,
  type LoadActionPerfOptions,
} from './docs';

export {
  createCreateIndexStream,
  createDeleteIndexStream,
  createGenerateIndexRecordsStream,
  deleteSavedObjectIndices,
  migrateSavedObjectIndices,
  cleanSavedObjectIndices,
  createDefaultSpace,
} from './indices';

export { createFilterRecordsStream } from './records';

export type { Stats } from './stats';
export { createStats } from './stats';

export {
  isGzip,
  prioritizeMappings,
  createParseArchiveStreams,
  createFormatArchiveStreams,
} from './archives';

export { readDirectory } from './directory';

export { Progress } from './progress';

export { getIndexTemplate } from './index_template';
