import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { ISearchGeneric } from '@kbn/search-types';
import type { KibanaContext } from '..';
import type { DataViewsContract, UiSettingsCommon } from '../..';
import type { EqlRawResponse } from './eql_raw_response';
declare const name = "eql";
type Input = KibanaContext | null;
type Output = Promise<EqlRawResponse>;
interface Arguments {
    query: string;
    index: string;
    size: number;
    field: string[];
}
export type EqlExpressionFunctionDefinition = ExpressionFunctionDefinition<typeof name, Input, Arguments, Output>;
interface EqlStartDependencies {
    search: ISearchGeneric;
    uiSettingsClient: UiSettingsCommon;
    dataViews: DataViewsContract;
}
export declare const getEqlFn: ({ getStartDependencies, }: {
    getStartDependencies: (getKibanaRequest: any) => Promise<EqlStartDependencies>;
}) => EqlExpressionFunctionDefinition;
export {};
