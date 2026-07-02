export declare function getRouteConfig(isDashboardAppRequest: boolean): {
    basePath: string;
    routeConfig: {
        readonly access: "internal";
        readonly enableQueryVersion: true;
        readonly description: "Dashboard application CRUD routes. Do not use outside of Kibana application. Instead, use dashboard REST API \"/api/dashboards\"";
        readonly security: {
            readonly authz: {
                readonly enabled: false;
                readonly reason: "Relies on Content Client for authorization";
            };
        };
        readonly options?: undefined;
    };
    routeVersion: string;
} | {
    basePath: string;
    routeConfig: {
        readonly access: "public";
        readonly description: "This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.";
        readonly options: {
            readonly tags: readonly ["oas-tag:Dashboards"];
            readonly availability: {
                readonly stability: "experimental";
                readonly since: "9.4.0";
            };
        };
        readonly security: {
            readonly authz: {
                readonly enabled: false;
                readonly reason: "Relies on Content Client for authorization";
            };
        };
        readonly enableQueryVersion?: undefined;
    };
    routeVersion: string;
};
