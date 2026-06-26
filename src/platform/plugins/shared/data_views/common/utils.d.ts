/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PersistenceAPI } from './types';
/**
 * Returns an object matching a given name
 *
 * @param client {SavedObjectsClientCommon}
 * @param name {string}
 * @returns {SavedObject|undefined}
 */
export declare function findByName(
  client: PersistenceAPI,
  name: string
): Promise<
  | import('@kbn/core/packages/saved-objects/common/src/server_types').SavedObject<
      import('./types').DataViewAttributes
    >
  | undefined
>;
export declare function unwrapEtag(ifNoneMatch: string): string;
