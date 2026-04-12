/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsImportWarning } from '@kbn/core-saved-objects-common';
import type { SavedObject } from '..';

/**
 * Result from a {@link SavedObjectsImportHook | import hook}
 *
 * @public
 */
export interface SavedObjectsImportHookResult {
  /**
   * An optional list of warnings to display in the UI when the import succeeds.
   */
  warnings?: SavedObjectsImportWarning[];
}

/**
 * A hook associated with a specific saved object type, that will be invoked during
 * the import process. The hook will have access to the objects of the registered type.
 *
 * Currently, the only supported feature for import hooks is to return warnings to be displayed
 * in the UI when the import succeeds.
 *
 * @remark The only interactions the hook can have with the import process is via the hook's
 *         response. Mutating the objects inside the hook's code will have no effect.
 *
 * @public
 */
export type SavedObjectsImportHook<T = unknown> = (
  objects: Array<SavedObject<T>>
) => SavedObjectsImportHookResult | Promise<SavedObjectsImportHookResult>;
