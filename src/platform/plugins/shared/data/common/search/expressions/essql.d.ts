import type { KibanaRequest } from '@kbn/core/server';
import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { Observable } from 'rxjs';
import type { ISearchGeneric } from '@kbn/search-types';
import type { NowProviderPublicContract } from '../../../public';
import type { UiSettingsCommon } from '../..';
import type { KibanaContext } from '..';
type Input = KibanaContext | null;
type Output = Observable<Datatable>;
interface Arguments {
    query: string;
    parameter?: Array<string | number | boolean>;
    count?: number;
    timezone?: string;
    timeField?: string;
}
export type EssqlExpressionFunctionDefinition = ExpressionFunctionDefinition<'essql', Input, Arguments, Output>;
interface EssqlFnArguments {
    getStartDependencies(getKibanaRequest: () => KibanaRequest): Promise<EssqlStartDependencies>;
}
interface EssqlStartDependencies {
    nowProvider?: NowProviderPublicContract;
    search: ISearchGeneric;
    uiSettings: UiSettingsCommon;
}
export declare const getEssqlFn: ({ getStartDependencies }: EssqlFnArguments) => EssqlExpressionFunctionDefinition;
export {};
