type TemplateVariableSegment = string | number;
type TemplateVariableSegments = TemplateVariableSegment[];
export declare class WorkflowTemplatingEngine {
    /**
     * Liquid tags that are not supported in workflow templates.
     */
    private static readonly UNSUPPORTED_TAG_PATTERN;
    private static readonly TEMPLATE_SYNTAX_PATTERN;
    private static readonly PARSED_TEMPLATE_CACHE_SIZE;
    private static readonly VARIABLE_SEGMENTS_CACHE_SIZE;
    private readonly engine;
    private readonly parsedTemplateCache;
    private readonly variableSegmentsCache;
    constructor();
    render<T>(obj: T, context: Record<string, unknown>): T;
    evaluateExpression(template: string, context: Record<string, unknown>): unknown;
    extractGlobalVariableSegments(value: unknown): TemplateVariableSegments[] | null;
    private renderValueRecursively;
    /**
     * Validates that a template string does not use unsupported Liquid tags.
     */
    private validateTemplate;
    private renderString;
    private extractGlobalVariableSegmentsRecursively;
    private extractTemplateVariableSegments;
    private getParsedTemplate;
    private setVariableSegmentsCache;
}
export {};
