import type { Step, WorkflowYaml } from '../spec/schema';
export type WorkflowStep = WorkflowYaml['steps'][number];
export interface NestedStepGroup {
    readonly pathSuffix: string;
    readonly steps: WorkflowYaml['steps'];
}
/** Returns nested step arrays and their path suffixes relative to the parent step path. */
export declare const getNestedStepGroups: (step: WorkflowStep) => ReadonlyArray<NestedStepGroup>;
export interface VisitNestedStepEntry<TStep extends WorkflowStep = WorkflowStep> {
    readonly step: TStep;
    readonly path: string;
    readonly name: string;
}
export interface VisitNestedStepsOptions {
    readonly parentPath?: string;
    readonly requireValidName?: boolean;
}
/** Depth-first walk of all named steps, including nested container subtrees. */
export declare const visitNestedSteps: <TStep extends WorkflowStep>(steps: ReadonlyArray<TStep>, visitor: (entry: VisitNestedStepEntry<TStep>) => void, options?: VisitNestedStepsOptions) => void;
/** Strip nested step trees so container entries compare only their own config fields. */
export declare const stripNestedStepContentForComparison: <TStep extends WorkflowStep>(step: TStep) => TStep;
export declare const collectAllSteps: (steps: WorkflowYaml["steps"]) => Step[];
export declare function getStepByNameFromNestedSteps(steps: WorkflowYaml['steps'], stepName: string): Step | null;
