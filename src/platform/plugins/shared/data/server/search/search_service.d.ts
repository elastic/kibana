import type { Observable } from 'rxjs';
import type { CoreSetup, CoreStart, Logger, PluginInitializerContext, SharedGlobalConfig, StartServicesAccessor } from '@kbn/core/server';
import type { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { ISearchSetup, ISearchStart } from './types';
import type { DataPluginStart, DataPluginStartDependencies } from '../plugin';
import type { ConfigSchema } from '../config';
/** @internal */
export interface SearchServiceSetupDependencies {
    expressions: ExpressionsServerSetup;
    usageCollection?: UsageCollectionSetup;
}
/** @internal */
export interface SearchServiceStartDependencies {
    fieldFormats: FieldFormatsStart;
    indexPatterns: DataViewsServerPluginStart;
}
/** @internal */
export interface SearchRouteDependencies {
    getStartServices: StartServicesAccessor<{}, DataPluginStart>;
    globalConfig$: Observable<SharedGlobalConfig>;
}
export declare class SearchService {
    private initializerContext;
    private readonly logger;
    private readonly aggsService;
    private readonly searchSourceService;
    private searchStrategies;
    private sessionService;
    private asScoped;
    private searchAsInternalUser;
    private rollupsEnabled;
    private readonly isServerless;
    constructor(initializerContext: PluginInitializerContext<ConfigSchema>, logger: Logger);
    setup(core: CoreSetup<DataPluginStartDependencies, DataPluginStart>, { expressions, usageCollection }: SearchServiceSetupDependencies): ISearchSetup;
    start(core: CoreStart, { fieldFormats, indexPatterns }: SearchServiceStartDependencies): ISearchStart;
    stop(): void;
    private registerSearchStrategy;
    private getSearchStrategy;
    private search;
    private cancel;
    private extend;
    private cancelSessionSearches;
    private cancelSession;
    private deleteSession;
    private updateSessionStatuses;
    private extendSession;
    private asScopedProvider;
    private createScopedEsClient;
}
