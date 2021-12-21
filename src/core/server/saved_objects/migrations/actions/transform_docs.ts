/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as TaskEither from 'fp-ts/lib/TaskEither';
import type { TransformRawDocs } from '../types';
import type { SavedObjectsRawDoc } from '../../serialization';
import {
  DocumentsTransformFailed,
  DocumentsTransformSuccess,
} from '../../migrations/core/migrate_raw_docs';

/** @internal */
export interface TransformDocsParams {
  transformRawDocs: TransformRawDocs;
  outdatedDocuments: SavedObjectsRawDoc[];
}
/*
 * Transform outdated docs
 * */
export const transformDocs = ({
  transformRawDocs,
  outdatedDocuments,
}: TransformDocsParams): TaskEither.TaskEither<
  DocumentsTransformFailed,
  DocumentsTransformSuccess
> => transformRawDocs(outdatedDocuments);
