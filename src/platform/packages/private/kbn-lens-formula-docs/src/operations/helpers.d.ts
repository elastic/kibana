import type { OperationDocumentationType } from './types';
export declare function buildMetricDocumentationDefinition({ id, name, documentation, }: {
    id: string;
    name: string;
    documentation?: string;
}): OperationDocumentationType;
export declare function buildContextVariableDocumentationDefinition({ id, name, documentation, }: {
    id: string;
    name: string;
    documentation: string;
}): OperationDocumentationType;
