import type { RouteRepositoryClient, ServerRouteRepository } from '@kbn/server-route-repository-utils';
import type { HttpHandler } from '@kbn/core-http-browser';
export declare function createRepositoryClient<TRepository extends ServerRouteRepository, TClientOptions extends Record<string, any> = {}>(core: {
    http: {
        fetch: HttpHandler;
    };
}): RouteRepositoryClient<TRepository, TClientOptions>;
