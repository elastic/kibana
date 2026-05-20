export declare function formatRequest(endpoint: string, pathParams?: Record<string, any>): {
    method: "get" | import("@kbn/core/server").DestructiveRouteMethod;
    pathname: string;
    version: string;
};
