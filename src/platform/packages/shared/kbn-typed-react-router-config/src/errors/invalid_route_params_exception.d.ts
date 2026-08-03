export declare class InvalidRouteParamsException extends Error {
    readonly patched: {
        path: Record<string, any>;
        query: Record<string, any>;
    };
    constructor(message: string, patched: {
        path: Record<string, any>;
        query: Record<string, any>;
    });
}
