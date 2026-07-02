export interface ManagedWorkflowManagement {
    lifecycle: 'static' | 'dynamic';
    versionStrategy: 'auto' | 'on_adopt';
    enablement: 'enforced' | 'restorable';
}
export interface ManagedWorkflowTemplateValues {
    [key: string]: unknown;
}
type ManagedWorkflowDefinitionSource<TValues extends ManagedWorkflowTemplateValues> = {
    yaml: string;
    yamlTemplate?: never;
} | {
    yaml?: never;
    yamlTemplate(values: TValues): string;
};
export type ManagedWorkflowDefinition<TValues extends ManagedWorkflowTemplateValues = ManagedWorkflowTemplateValues> = {
    id: string;
    pluginId: string;
    version: number;
    management: ManagedWorkflowManagement;
} & ManagedWorkflowDefinitionSource<TValues>;
export {};
