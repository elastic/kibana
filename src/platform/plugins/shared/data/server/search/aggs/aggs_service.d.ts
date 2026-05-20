import type { UiSettingsServiceStart } from '@kbn/core/server';
import type { ExpressionsServiceSetup } from '@kbn/expressions-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { AggsSetup, AggsStart } from './types';
/** @internal */
export interface AggsSetupDependencies {
    registerFunction: ExpressionsServiceSetup['registerFunction'];
}
/** @internal */
export interface AggsStartDependencies {
    fieldFormats: FieldFormatsStart;
    uiSettings: UiSettingsServiceStart;
    indexPatterns: DataViewsServerPluginStart;
}
/**
 * The aggs service provides a means of modeling and manipulating the various
 * Elasticsearch aggregations supported by Kibana, providing the ability to
 * output the correct DSL when you are ready to send your request to ES.
 */
export declare class AggsService {
    private readonly aggsCommonService;
    /**
     * getForceNow uses window.location on the client, so we must have a
     * separate implementation of calculateBounds on the server.
     */
    private calculateBounds;
    setup({ registerFunction }: AggsSetupDependencies): AggsSetup;
    start({ fieldFormats, uiSettings, indexPatterns }: AggsStartDependencies): AggsStart;
    stop(): void;
}
