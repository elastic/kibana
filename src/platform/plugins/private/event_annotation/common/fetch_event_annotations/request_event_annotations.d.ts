import type { ExpressionValueSearchContext } from '@kbn/data-plugin/common';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { Adapters } from '@kbn/inspector-plugin/common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { FetchEventAnnotationsArgs, FetchEventAnnotationsStartDependencies } from './types';
export declare function getTimeZone(uiSettings: IUiSettingsClient): any;
export declare const requestEventAnnotations: (input: ExpressionValueSearchContext | null, args: FetchEventAnnotationsArgs, { inspectorAdapters, abortSignal, getSearchSessionId, getExecutionContext, }: ExecutionContext<Adapters>, getStartDependencies: () => Promise<FetchEventAnnotationsStartDependencies>) => import("rxjs").Observable<import("@kbn/expressions-plugin/common").Datatable | {
    rows: never[];
    columns: never[];
    type: string;
}>;
