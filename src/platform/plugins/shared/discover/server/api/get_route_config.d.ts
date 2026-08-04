export declare const getRouteConfig: () => {
    basePath: string;
    routeConfig: {
        readonly access: "internal";
        readonly enableQueryVersion: true;
        readonly security: {
            readonly authz: {
                enabled: false;
                reason: string;
            };
        };
    };
    routeVersion: string;
};
