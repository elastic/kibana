/**
 * Extract the distinct step and trigger `type` values from a parsed workflow
 * body, in document order. Mirrors the catalog generator: trigger types come
 * from the top-level `triggers[]` only, step types include nested steps
 * (foreach / if / switch / parallel branches) via `collectAllSteps`. This keeps
 * the detail page's icon row identical to the catalog card and avoids treating
 * a trigger's `inputs[].type` as a trigger.
 */
export declare function getWorkflowTypes(body: Record<string, unknown>): {
    stepTypes: string[];
    triggerTypes: string[];
};
