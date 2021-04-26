/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsResolveResponse } from '../../server';
import type { SimpleSavedObject } from './simple_saved_object';

/**
 * This class is a very simple wrapper for SavedObjects loaded from the server
 * with the {@link SavedObjectsClient}.
 *
 * It provides basic functionality for creating/saving/deleting saved objects,
 * but doesn't include any type-specific implementations.
 *
 * @public
 */
export class ResolvedSimpleSavedObject<T = unknown> {
  constructor(
    public savedObject: SimpleSavedObject<T>,
    public outcome: SavedObjectsResolveResponse['outcome'],
    public aliasTargetId: SavedObjectsResolveResponse['aliasTargetId']
  ) {}
}
