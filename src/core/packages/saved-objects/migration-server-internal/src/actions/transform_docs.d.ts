import type * as TaskEither from 'fp-ts/TaskEither';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type { TransformRawDocs } from '../types';
import type { DocumentsTransformFailed, DocumentsTransformSuccess } from '../core/migrate_raw_docs';
/** @internal */
export interface TransformDocsParams {
    transformRawDocs: TransformRawDocs;
    outdatedDocuments: SavedObjectsRawDoc[];
}
export declare const transformDocs: ({ transformRawDocs, outdatedDocuments, }: TransformDocsParams) => TaskEither.TaskEither<DocumentsTransformFailed, DocumentsTransformSuccess>;
