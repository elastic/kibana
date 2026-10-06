export interface SupportsJsonExport {
    supportsJsonExport: boolean;
}
export declare const apiSupportsJsonExport: (api: unknown | null) => api is SupportsJsonExport;
