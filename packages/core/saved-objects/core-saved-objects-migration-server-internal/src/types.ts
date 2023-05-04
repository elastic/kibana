/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as TaskEither from 'fp-ts/lib/TaskEither';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type { DocumentsTransformFailed, DocumentsTransformSuccess } from './core';

/** @internal */
export type TransformRawDocs = (
  rawDocs: SavedObjectsRawDoc[]
) => TaskEither.TaskEither<DocumentsTransformFailed, DocumentsTransformSuccess>;

/** @internal */
export type MigrationLogLevel = 'error' | 'info' | 'warning';

/** @internal */
export interface MigrationLog {
  level: MigrationLogLevel;
  message: string;
}

/** @internal */
export interface Progress {
  processed: number | undefined;
  total: number | undefined;
}
