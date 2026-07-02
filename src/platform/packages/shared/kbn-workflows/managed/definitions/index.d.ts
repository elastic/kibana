export { EXAMPLE_MANAGED_WORKFLOW_ID } from './workflows_extensions_example';
export declare const managedWorkflowDefinitions: readonly [{
    readonly id: "system-example-greeting";
    readonly pluginId: "workflowsExtensionsExample";
    readonly version: 1;
    readonly yamlTemplate: ({ recipient }: import("./workflows_extensions_example").ExampleManagedWorkflowTemplateValues) => string;
    readonly management: {
        readonly lifecycle: "static";
        readonly versionStrategy: "auto";
        readonly enablement: "restorable";
    };
}];
