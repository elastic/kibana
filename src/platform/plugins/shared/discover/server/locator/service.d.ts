import type { CoreStart } from '@kbn/core/server';
import type { DiscoverServerPluginLocatorService, DiscoverServerPluginStartDeps } from '..';
export declare const getScopedClient: (core: CoreStart, deps: DiscoverServerPluginStartDeps) => DiscoverServerPluginLocatorService;
