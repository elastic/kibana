import type { APMIndices } from '@kbn/apm-sources-access-plugin/public';
export interface ErrorsContextService {
    getErrorsIndexPattern(): string | undefined;
}
export declare const createErrorsContextService: ({ indices, }: {
    indices: APMIndices | null;
}) => ErrorsContextService;
export declare const getErrorsContextService: (error?: string) => {
    getErrorsIndexPattern: () => string | undefined;
};
