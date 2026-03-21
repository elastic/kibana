export declare class WorkflowTemplatingEngine {
    /**
     * Liquid tags that are not supported in workflow templates.
     */
    private static readonly UNSUPPORTED_TAG_PATTERN;
    private readonly engine;
    constructor();
    render<T>(obj: T, context: Record<string, unknown>): T;
    evaluateExpression(template: string, context: Record<string, unknown>): unknown;
    private renderValueRecursively;
    /**
     * Validates that a template string does not use unsupported Liquid tags.
     */
    private validateTemplate;
    private renderString;
}
