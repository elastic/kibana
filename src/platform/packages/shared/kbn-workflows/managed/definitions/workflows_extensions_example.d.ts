import type { ManagedWorkflowTemplateValues } from '../types';
export declare const EXAMPLE_MANAGED_WORKFLOW_ID = "system-example-greeting";
export interface ExampleManagedWorkflowTemplateValues extends ManagedWorkflowTemplateValues {
    recipient: string;
}
export declare const EXAMPLE_MANAGED_WORKFLOW: {
    readonly id: "system-example-greeting";
    readonly pluginId: "workflowsExtensionsExample";
    readonly version: 1;
    readonly yamlTemplate: ({ recipient }: ExampleManagedWorkflowTemplateValues) => string;
    readonly management: {
        readonly lifecycle: "static";
        readonly versionStrategy: "auto";
        readonly enablement: "restorable";
    };
};
