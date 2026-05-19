import type { RouterDeprecatedApiDetails } from '@kbn/core-http-server';
export declare const buildApiDeprecationId: ({ routePath, routeMethod, routeVersion, }: Pick<RouterDeprecatedApiDetails, "routeMethod" | "routePath" | "routeVersion">) => string;
