import type { KibanaRequest } from '@kbn/core/server';
import type { ISearchGeneric } from '@kbn/search-types';
import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { Observable } from 'rxjs';
import { type KibanaContext } from '..';
import type { UiSettingsCommon } from '../..';
declare global {
    interface Window {
        /**
         * Debug setting to make requests complete slower than normal. Only available on snapshots where `error_query` is enabled in ES.
         */
        ELASTIC_ESQL_DELAY_SECONDS?: number;
    }
}
type Input = KibanaContext | null;
type Output = Observable<Datatable>;
interface Arguments {
    query: string;
    timeField?: string;
    locale?: string;
    /**
     * Requests' meta for showing in Inspector
     */
    titleForInspector?: string;
    descriptionForInspector?: string;
    ignoreGlobalFilters?: boolean;
}
export type EsqlExpressionFunctionDefinition = ExpressionFunctionDefinition<'esql', Input, Arguments, Output>;
interface EsqlFnArguments {
    getStartDependencies(getKibanaRequest: () => KibanaRequest): Promise<EsqlStartDependencies>;
}
interface EsqlStartDependencies {
    search: ISearchGeneric;
    uiSettings: UiSettingsCommon;
}
export declare const getEsqlFn: ({ getStartDependencies }: EsqlFnArguments) => EsqlExpressionFunctionDefinition;
export {};
