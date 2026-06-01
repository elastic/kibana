import type { DefaultRouteHandlerResources, ServerRouteHandlerResources } from '@kbn/server-route-repository-utils';
import type { CreateServerRouteFactory, DefaultRouteCreateOptions } from '@kbn/server-route-repository-utils/src/typings';
export declare function createServerRouteFactory<TRouteHandlerResources extends ServerRouteHandlerResources = DefaultRouteHandlerResources, TRouteCreateOptions extends DefaultRouteCreateOptions | undefined = undefined>(): CreateServerRouteFactory<TRouteHandlerResources, TRouteCreateOptions>;
