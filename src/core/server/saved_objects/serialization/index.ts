/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * This file contains the logic for transforming saved objects to / from
 * the raw document format as stored in ElasticSearch.
 */

export {
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
  SavedObjectsRawDoc,
  SavedObjectsRawDocParseOptions,
  SavedObjectsRawDocSource,
} from './types';
export { SavedObjectsSerializer } from './serializer';
