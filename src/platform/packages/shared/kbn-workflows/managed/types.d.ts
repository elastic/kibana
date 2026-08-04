export interface ManagedWorkflowManagement {
    lifecycle: 'static' | 'dynamic';
    versionStrategy: 'auto' | 'on_adopt';
    enablement: 'enforced' | 'restorable';
}
export declare const MANAGED_WORKFLOW_SELECTORS: readonly ["rule_action", "watch"];
export declare const MANAGED_WORKFLOW_SOLUTIONS: readonly ["security"];
export type ManagedWorkflowSelector = (typeof MANAGED_WORKFLOW_SELECTORS)[number];
export type ManagedWorkflowSolution = (typeof MANAGED_WORKFLOW_SOLUTIONS)[number];
export type ManagedWorkflowSelectorVisibilityContext = `selector:${ManagedWorkflowSelector}`;
export type ManagedWorkflowSolutionVisibilityContext = `solution:${ManagedWorkflowSolution}`;
export type ManagedWorkflowVisibilityContext = ManagedWorkflowSelectorVisibilityContext | ManagedWorkflowSolutionVisibilityContext;
export declare const getManagedWorkflowSelectorVisibilityContext: <TSelector extends ManagedWorkflowSelector>(selector: TSelector) => `selector:${TSelector}`;
export declare const getManagedWorkflowSolutionVisibilityContext: <TSolution extends ManagedWorkflowSolution>(solution: TSolution) => `solution:${TSolution}`;
export interface ManagedWorkflowVisibility {
    selectors?: readonly ManagedWorkflowSelector[];
    solutions?: readonly ManagedWorkflowSolution[];
}
export declare const getManagedWorkflowVisibilityContexts: (visibility: ManagedWorkflowVisibility | undefined) => ManagedWorkflowVisibilityContext[];
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
    billable: boolean;
    visibility?: ManagedWorkflowVisibility;
    management: ManagedWorkflowManagement;
} & ManagedWorkflowDefinitionSource<TValues>;
export {};
