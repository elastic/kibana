import type { KibanaRequest, PluginInitializerContext } from '@kbn/core/server';
import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import type { ColumnsFromLocatorFn, SearchSourceFromLocatorFn, TitleFromLocatorFn, QueryFromLocatorFn, FiltersFromLocatorFn, TimeFieldNameFromLocatorFn } from './locator';
export interface DiscoverServerPluginStartDeps {
    data: DataPluginStart;
}
export interface LocatorServiceScopedClient {
    columnsFromLocator: ColumnsFromLocatorFn;
    searchSourceFromLocator: SearchSourceFromLocatorFn;
    titleFromLocator: TitleFromLocatorFn;
    queryFromLocator: QueryFromLocatorFn;
    filtersFromLocator: FiltersFromLocatorFn;
    timeFieldNameFromLocator: TimeFieldNameFromLocatorFn;
}
export interface DiscoverServerPluginLocatorService {
    asScopedClient: (req: KibanaRequest<unknown>) => Promise<LocatorServiceScopedClient>;
}
export interface DiscoverServerPluginStart {
    locator: DiscoverServerPluginLocatorService;
}
export { config } from './config';
export type { DiscoverSessionClassicTab, DiscoverSessionEsqlTab, DiscoverSessionTab, DiscoverSessionPanelOverrides, DiscoverSessionEmbeddableByValueProps, DiscoverSessionEmbeddableByReferenceProps, DiscoverSessionEmbeddableByValueState, DiscoverSessionEmbeddableByReferenceState, DiscoverSessionEmbeddableState, } from './embeddable';
export declare const plugin: (context: PluginInitializerContext) => Promise<import("./plugin").DiscoverServerPlugin>;
