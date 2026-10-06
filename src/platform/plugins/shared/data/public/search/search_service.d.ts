import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import type { ConfigSchema } from '../../server/config';
import type { NowProviderInternalContract } from '../now_provider';
import type { ISearchSetup, ISearchStart } from './types';
/** @internal */
export interface SearchServiceSetupDependencies {
    expressions: ExpressionsSetup;
    usageCollection?: UsageCollectionSetup;
    nowProvider: NowProviderInternalContract;
}
/** @internal */
export interface SearchServiceStartDependencies {
    fieldFormats: FieldFormatsStart;
    dataViews: DataViewsContract;
    inspector: InspectorStartContract;
    screenshotMode: ScreenshotModePluginStart;
    scriptedFieldsEnabled: boolean;
    cps?: CPSPluginStart;
}
export declare class SearchService implements Plugin<ISearchSetup, ISearchStart> {
    private initializerContext;
    private readonly aggsService;
    private readonly searchSourceService;
    private searchInterceptor;
    private searchMethodsService;
    private usageCollector;
    private sessionService;
    private sessionsClient;
    private searchSessionEBTManager;
    private cpsManager?;
    constructor(initializerContext: PluginInitializerContext<ConfigSchema>);
    setup(core: CoreSetup, { expressions, usageCollection, nowProvider }: SearchServiceSetupDependencies): ISearchSetup;
    start(coreStart: CoreStart, { fieldFormats, dataViews, inspector, scriptedFieldsEnabled, cps, }: SearchServiceStartDependencies): ISearchStart;
    stop(): void;
}
