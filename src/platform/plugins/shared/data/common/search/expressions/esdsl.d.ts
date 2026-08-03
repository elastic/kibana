import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { ISearchMethods } from '@kbn/search-types';
import type { EsRawResponse } from './es_raw_response';
import type { KibanaContext } from '..';
import type { UiSettingsCommon } from '../..';
declare const name = "esdsl";
type Input = KibanaContext | null;
type Output = Promise<EsRawResponse>;
interface Arguments {
    dsl: string;
    index: string;
    size: number;
}
export type EsdslExpressionFunctionDefinition = ExpressionFunctionDefinition<typeof name, Input, Arguments, Output>;
interface EsdslStartDependencies {
    searchService: ISearchMethods;
    uiSettingsClient: UiSettingsCommon;
}
export declare const getEsdslFn: ({ getStartDependencies, }: {
    getStartDependencies: (getKibanaRequest: any) => Promise<EsdslStartDependencies>;
}) => EsdslExpressionFunctionDefinition;
export {};
