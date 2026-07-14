import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { TypeTransforms } from '../types';
import type { MigrationPipeline, MigrationPipelineResult } from './types';
export declare class DocumentDowngradePipeline implements MigrationPipeline {
    private document;
    private kibanaVersion;
    private originalDoc;
    private typeTransforms;
    private targetTypeVersion;
    private targetCoreVersion?;
    constructor({ document, kibanaVersion, typeTransforms, targetTypeVersion, targetCoreVersion, }: {
        document: SavedObjectUnsanitizedDoc;
        typeTransforms: TypeTransforms;
        kibanaVersion: string;
        targetTypeVersion: string;
        targetCoreVersion?: string;
    });
    run(): MigrationPipelineResult;
    private getPendingTransforms;
    private isPendingTransform;
    /**
     * Verifies that the current document version is not greater than the version supported by Kibana.
     * And that the targetTypeVersion is not greater than the document's
     */
    private assertCompatibility;
    private ensureVersion;
    private applyVersionSchema;
}
