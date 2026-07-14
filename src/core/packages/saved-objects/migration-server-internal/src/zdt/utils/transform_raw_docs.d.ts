import type { ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import type { IDocumentMigrator } from '@kbn/core-saved-objects-base-server-internal';
import type { TransformRawDocs } from '../../types';
export interface CreateDocumentTransformFnOpts {
    serializer: ISavedObjectsSerializer;
    documentMigrator: IDocumentMigrator;
}
export declare const createDocumentTransformFn: ({ documentMigrator, serializer, }: CreateDocumentTransformFnOpts) => TransformRawDocs;
