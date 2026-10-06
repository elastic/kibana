import type { WorkflowYaml } from './schema';
export declare const isKibanaWorkflowStepType: (stepType: string) => boolean;
export declare const stepHasIgnoredKibanaFetcher: (step: {
    type?: string;
    with?: unknown;
}) => boolean;
type DiagnosticPath = Array<string | number>;
export interface IgnoredKibanaFetcherOccurrence {
    path: DiagnosticPath;
    stepType: string;
    stepName?: string;
}
/** Core self-client ignores YAML `fetcher` for every `kibana.*` step. */
export declare const shouldWarnIgnoredKibanaFetcher: (stepType: string, warnKibanaFetcher: boolean) => boolean;
/** Structural `WorkflowDiagnostic.path` values plus step type for ignored kibana `with.fetcher` settings. */
export declare const collectIgnoredKibanaFetcherOccurrences: (steps: WorkflowYaml['steps'] | undefined) => IgnoredKibanaFetcherOccurrence[];
/** Structural `WorkflowDiagnostic.path` values for ignored kibana `with.fetcher` settings. */
export declare const collectIgnoredKibanaFetcherPaths: (steps: WorkflowYaml['steps'] | undefined) => DiagnosticPath[];
/** Step names whose YAML still sets `with.fetcher` on a kibana.* step. */
export declare const collectIgnoredKibanaFetcherStepNames: (steps: WorkflowYaml['steps'] | undefined) => string[];
export {};
