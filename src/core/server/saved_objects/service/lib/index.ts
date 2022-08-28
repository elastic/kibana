/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { SavedObjectsRepository } from './repository';
export { SavedObjectsClientProvider } from './scoped_client_provider';

export type { ISavedObjectsClientProvider } from './scoped_client_provider';

export { getIndexForType } from './get_index_for_type';
