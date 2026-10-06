import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { type Transform, TransformType } from '../types';
/** transform types using `coreMigrationVersion` and not `typeMigrationVersion` */
export declare const coreVersionTransformTypes: TransformType[];
/**
 * Apply the version of the given {@link Transform | transform} to the given {@link SavedObjectUnsanitizedDoc | document}.
 * Will update `coreMigrationVersion` or `typeMigrationVersion` depending on the type of the transform.
 */
export declare const applyVersion: ({ document, transform, }: {
    document: SavedObjectUnsanitizedDoc;
    transform: Transform;
}) => SavedObjectUnsanitizedDoc;
/**
 * Asserts the document's core version is valid and not greater than the current Kibana version.
 * Hence, the object does not belong to a more recent version of Kibana.
 */
export declare const assertValidCoreVersion: ({ kibanaVersion, document, }: {
    document: SavedObjectUnsanitizedDoc;
    kibanaVersion: string;
}) => void;
export declare function maxVersion(a?: string, ...otherVersions: string[]): string | undefined;
