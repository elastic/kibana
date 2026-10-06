import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
export interface MigrationPipelineResult {
    document: SavedObjectUnsanitizedDoc;
    additionalDocs: SavedObjectUnsanitizedDoc[];
}
export interface MigrationPipeline {
    run(): MigrationPipelineResult;
}
