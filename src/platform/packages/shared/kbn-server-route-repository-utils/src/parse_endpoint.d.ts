export declare function parseEndpoint(endpoint: string): {
    method: "get" | import("@kbn/core-http-server").DestructiveRouteMethod;
    pathname: string;
    version: string;
};
