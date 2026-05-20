import type { EsWorkflow } from '@kbn/workflows';
/**
 * Checks if a workflow update affects YAML metadata fields
 * (enabled, name, description, tags) that require YAML synchronization.
 */
export declare function affectsYamlMetadata(workflow: Partial<EsWorkflow>): boolean;
/**
 * Updates multiple YAML fields in a workflow YAML string while preserving formatting.
 * This is a convenience function that applies multiple field updates in sequence.
 *
 * @param yamlString - The original YAML string
 * @param workflow - The workflow update object containing fields to update
 * @param enabledValue - The resolved enabled value (may differ from workflow.enabled due to validation)
 * @returns The updated YAML string with all fields updated
 */
export declare function updateWorkflowYamlFields(yamlString: string, workflow: Partial<EsWorkflow>, enabledValue?: boolean): string;
