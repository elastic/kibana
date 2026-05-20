interface KibanaRequestParams {
    body?: unknown;
    query?: unknown;
    params?: unknown;
}
export declare function stripNullishRequestParameters(params: KibanaRequestParams): Partial<{
    path: any;
    body: any;
    query: any;
}>;
export {};
