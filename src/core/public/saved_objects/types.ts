/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsResolveResponse } from '../../server';
import { SimpleSavedObject } from './simple_saved_object';

/**
 * This interface is a very simple wrapper for SavedObjects resolved from the server
 * with the {@link SavedObjectsClient}.
 *
 * @public
 */
export interface ResolvedSimpleSavedObject<T = unknown> {
  /**
   * The saved object that was found.
   */
  saved_object: SimpleSavedObject<T>;
  /**
   * The outcome for a successful `resolve` call is one of the following values:
   *
   *  * `'exactMatch'` -- One document exactly matched the given ID.
   *  * `'aliasMatch'` -- One document with a legacy URL alias matched the given ID; in this case the `saved_object.id` field is different
   *    than the given ID.
   *  * `'conflict'` -- Two documents matched the given ID, one was an exact match and another with a legacy URL alias; in this case the
   *    `saved_object` object is the exact match, and the `saved_object.id` field is the same as the given ID.
   */
  outcome: SavedObjectsResolveResponse['outcome'];
  /**
   * The ID of the object that the legacy URL alias points to. This is only defined when the outcome is `'aliasMatch'` or `'conflict'`.
   */
  alias_target_id?: SavedObjectsResolveResponse['alias_target_id'];
}
