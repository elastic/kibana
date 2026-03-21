import type { ExpressionsServiceSetup } from '@kbn/expressions-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import type { AggTypesDependencies } from '../..';
import type { GetConfigFn } from '../../types';
import type { AggsCommonSetup, AggsCommonStart } from './types';
/** @internal */
export declare const aggsRequiredUiSettings: string[];
export interface AggsCommonSetupDependencies {
    registerFunction: ExpressionsServiceSetup['registerFunction'];
}
export interface AggsCommonStartDependencies {
    getIndexPattern(id: string): Promise<DataView>;
    getConfig: GetConfigFn;
    fieldFormats: FieldFormatsStartCommon;
    calculateBounds: AggTypesDependencies['calculateBounds'];
}
/**
 * The aggs service provides a means of modeling and manipulating the various
 * Elasticsearch aggregations supported by Kibana, providing the ability to
 * output the correct DSL when you are ready to send your request to ES.
 */
export declare class AggsCommonService {
    private aggExecutionContext?;
    private readonly aggTypesRegistry;
    constructor(aggExecutionContext?: AggTypesDependencies['aggExecutionContext']);
    setup({ registerFunction }: AggsCommonSetupDependencies): AggsCommonSetup;
    start({ getConfig, fieldFormats, calculateBounds, }: AggsCommonStartDependencies): AggsCommonStart;
}
