import React from 'react';
export interface WorkflowYamlPreviewProps {
    /** Workflow YAML to render (already cleaned of the `template-metadata` block). */
    yaml: string;
    /** Editor height. Defaults to `100%` so the parent controls the size. */
    height?: number | string;
    'data-test-subj'?: string;
}
/**
 * Read-only Monaco preview of a workflow YAML, styled like the workflow editor:
 * the workflows theme plus inline step/trigger type icons rendered next to each
 * `type:` value. Requires a `WorkflowsUiServicesProvider` ancestor to resolve
 * connector / step / trigger icons.
 */
export declare const WorkflowYamlPreview: React.NamedExoticComponent<WorkflowYamlPreviewProps>;
