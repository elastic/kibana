import type { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import type { PluginStart as DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { ConfigSchema } from './config';
import type { ISearchSetup, ISearchStart } from './search';
import { DatatableUtilitiesService } from './datatable_utilities';
import type { QuerySetup } from './query';
export interface DataPluginSetup {
    search: ISearchSetup;
    query: QuerySetup;
    /**
     * @deprecated - use "fieldFormats" plugin directly instead
     */
    fieldFormats: FieldFormatsSetup;
}
export interface DataPluginStart {
    search: ISearchStart;
    /**
     * @deprecated - use "fieldFormats" plugin directly instead
     */
    fieldFormats: FieldFormatsStart;
    indexPatterns: DataViewsServerPluginStart;
    /**
     * Datatable type utility functions.
     */
    datatableUtilities: DatatableUtilitiesService;
}
export interface DataPluginSetupDependencies {
    expressions: ExpressionsServerSetup;
    usageCollection?: UsageCollectionSetup;
    fieldFormats: FieldFormatsSetup;
}
export interface DataPluginStartDependencies {
    fieldFormats: FieldFormatsStart;
    logger: Logger;
    dataViews: DataViewsServerPluginStart;
}
export declare class DataServerPlugin implements Plugin<DataPluginSetup, DataPluginStart, DataPluginSetupDependencies, DataPluginStartDependencies> {
    private readonly searchService;
    private readonly scriptsService;
    private readonly kqlTelemetryService;
    private readonly queryService;
    private readonly logger;
    private readonly config;
    constructor(initializerContext: PluginInitializerContext<ConfigSchema>);
    setup(core: CoreSetup<DataPluginStartDependencies, DataPluginStart>, { expressions, usageCollection, fieldFormats }: DataPluginSetupDependencies): {
        search: ISearchSetup;
        query: QuerySetup;
        fieldFormats: FieldFormatsSetup;
    };
    start(core: CoreStart, { fieldFormats, dataViews }: DataPluginStartDependencies): {
        datatableUtilities: DatatableUtilitiesService;
        search: ISearchStart<import("@kbn/search-types").IEsSearchRequest<import("@kbn/search-types").ISearchRequestParams>, import("@kbn/search-types").IEsSearchResponse>;
        fieldFormats: FieldFormatsStart;
        indexPatterns: DataViewsServerPluginStart;
    };
    stop(): void;
}
export { DataServerPlugin as Plugin };
