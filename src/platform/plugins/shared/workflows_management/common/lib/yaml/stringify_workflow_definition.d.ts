/**
 * Stringify the workflow definition to a YAML string.
 * @param workflowDefinition - The workflow definition as a JSON object.
 * @param sortKeys - Whether to sort the keys of the workflow definition.
 * @returns The YAML string of the workflow definition.
 */
export declare function stringifyWorkflowDefinition(workflowDefinition: Record<string, any>, sortKeys?: boolean): string;
