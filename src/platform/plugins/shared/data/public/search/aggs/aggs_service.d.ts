import type { Subscription } from 'rxjs';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ExpressionsServiceSetup } from '@kbn/expressions-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { AggsCommonStartDependencies } from '../../../common/search/aggs';
import type { AggsSetup, AggsStart } from './types';
import type { NowProviderInternalContract } from '../../now_provider';
/**
 * Aggs needs synchronous access to specific uiSettings. Since settings can change
 * without a page refresh, we create a cache that subscribes to changes from
 * uiSettings.get$ and keeps everything up-to-date.
 *
 * @internal
 */
export declare function createGetConfig(uiSettings: IUiSettingsClient, requiredSettings: string[], subscriptions: Subscription[]): AggsCommonStartDependencies['getConfig'];
/** @internal */
export interface AggsSetupDependencies {
    uiSettings: IUiSettingsClient;
    registerFunction: ExpressionsServiceSetup['registerFunction'];
    nowProvider: NowProviderInternalContract;
}
/** @internal */
export interface AggsStartDependencies {
    fieldFormats: FieldFormatsStart;
    dataViews: DataViewsContract;
}
/**
 * The aggs service provides a means of modeling and manipulating the various
 * Elasticsearch aggregations supported by Kibana, providing the ability to
 * output the correct DSL when you are ready to send your request to ES.
 */
export declare class AggsService {
    private readonly aggsCommonService;
    private getConfig?;
    private subscriptions;
    private nowProvider;
    /**
     * NowGetter uses window.location, so we must have a separate implementation
     * of calculateBounds on the client and the server.
     */
    private calculateBounds;
    setup({ registerFunction, uiSettings, nowProvider }: AggsSetupDependencies): AggsSetup;
    start({ dataViews, fieldFormats }: AggsStartDependencies): AggsStart;
    stop(): void;
}
