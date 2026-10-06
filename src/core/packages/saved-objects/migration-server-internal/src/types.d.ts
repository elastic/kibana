import type * as TaskEither from 'fp-ts/TaskEither';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type { DocumentsTransformFailed, DocumentsTransformSuccess } from './core';
/** @internal */
export type TransformRawDocs = (rawDocs: SavedObjectsRawDoc[]) => TaskEither.TaskEither<DocumentsTransformFailed, DocumentsTransformSuccess>;
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
