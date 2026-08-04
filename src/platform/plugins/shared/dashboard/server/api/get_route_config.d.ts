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
        readonly options: {
            readonly tags: readonly ["oas-tag:Dashboards"];
            readonly availability: {
                readonly stability: "stable";
                readonly since: "9.5.0";
            };
        };
        readonly security: {
            readonly authz: {
                readonly enabled: false;
                readonly reason: "Relies on Content Client for authorization";
            };
        };
        readonly enableQueryVersion?: undefined;
        description?: undefined;
    };
    routeVersion: string;
};
