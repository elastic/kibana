import type { APMIndices, ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
export interface TracesContextService {
    getAllTracesIndexPattern(): string | undefined;
    isTracesIndexPattern(indexPattern: unknown): boolean;
    containsTracesIndexPattern(indexPattern: unknown): boolean;
}
export interface TracesContextServiceDeps {
    apmSourcesAccess?: ApmSourceAccessPluginStart;
}
export declare const DEFAULT_ALLOWED_TRACES_BASE_PATTERNS: string[];
export declare const DEFAULT_ALLOWED_TRACES_BASE_PATTERNS_REGEXP: RegExp;
export declare const createTracesContextService: ({ indices, }: {
    indices: APMIndices | null;
}) => TracesContextService;
export declare const getTracesContextService: ({ tracesIndexPattern, allowedDataSources, }: {
    tracesIndexPattern?: string;
    allowedDataSources: Array<string | RegExp>;
}) => {
    getAllTracesIndexPattern: () => string | undefined;
    isTracesIndexPattern: (value: string) => boolean;
    containsTracesIndexPattern: (indexPattern: unknown) => boolean;
};
