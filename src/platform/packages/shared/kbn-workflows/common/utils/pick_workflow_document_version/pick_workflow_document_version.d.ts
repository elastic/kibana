export declare const isValidWorkflowDocumentVersion: (version: unknown) => version is number;
export declare const pickWorkflowDocumentVersion: (source: {
    version?: unknown;
}) => {
    version?: number;
};
