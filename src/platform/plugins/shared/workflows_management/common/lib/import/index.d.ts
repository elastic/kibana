import { MAX_WORKFLOW_YAML_LENGTH } from '@kbn/workflows';
import { z } from '@kbn/zod';
export { buildSuffixedCandidate, resolveCollisionId, MAX_COLLISION_RETRIES, } from '@kbn/human-readable-id';
export declare const MAX_IMPORT_WORKFLOWS = 500;
/** Maximum total decompressed size of all workflow entries in a ZIP archive (50 MB). */
export declare const MAX_AGGREGATE_IMPORT_BYTES: number;
export declare const WORKFLOW_EXECUTE_TYPES: Set<string>;
/** The YAML key under `with:` that holds the target workflow ID. */
export declare const WORKFLOW_REFERENCE_KEY = "workflow-id";
/** Returns true when a workflow-id value is a dynamic template (e.g. `{{ inputs.id }}`). */
export declare const isDynamicWorkflowReference: (value: string) => boolean;
export declare const isUnsafeWorkflowId: (id: string, maxLength?: number) => boolean;
export declare const isReservedWorkflowId: (id: string) => boolean;
export declare const isValidWorkflowId: (id: string) => boolean;
export declare const generateWorkflowId: (name?: string | null) => string;
/**
 * Detects whether a byte sequence is a ZIP archive or YAML text by checking
 * the first two bytes for the ZIP magic number (`PK`).
 * Accepts both `Buffer` (Node) and `Uint8Array` (browser) inputs.
 */
export declare function detectFileFormat(bytes: Uint8Array): 'zip' | 'yaml';
export declare const WORKFLOW_EXPORT_VERSION = "1";
export { MAX_WORKFLOW_YAML_LENGTH };
export declare const WorkflowExportEntrySchema: z.ZodObject<{
    id: z.ZodString;
    yaml: z.ZodString;
}, z.core.$strip>;
export declare const WorkflowExportManifestSchema: z.ZodObject<{
    exportedCount: z.ZodNumber;
    exportedAt: z.ZodString;
    version: z.ZodEnum<{
        1: "1";
    }>;
}, z.core.$strict>;
export type WorkflowExportEntry = z.infer<typeof WorkflowExportEntrySchema>;
export type WorkflowExportManifest = z.infer<typeof WorkflowExportManifestSchema>;
export interface ExportWorkflowsResponse {
    entries: WorkflowExportEntry[];
    manifest: WorkflowExportManifest;
}
