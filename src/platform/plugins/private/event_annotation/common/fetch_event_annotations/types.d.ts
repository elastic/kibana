import type { Observable } from 'rxjs';
import type { AggsStart, DataViewsContract, ExpressionValueSearchContext, ISearchStartSearchSource } from '@kbn/data-plugin/common';
import type { ExpressionFunctionDefinition, Datatable } from '@kbn/expressions-plugin/common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { EventAnnotationGroupOutput } from '../event_annotation_group';
export type FetchEventAnnotationsOutput = Observable<Datatable | {
    rows: never[];
    columns: never[];
    type: string;
}>;
export interface FetchEventAnnotationsArgs {
    groups: EventAnnotationGroupOutput[];
    interval: string;
}
export type FetchEventAnnotationsExpressionFunctionDefinition = ExpressionFunctionDefinition<'fetch_event_annotations', ExpressionValueSearchContext | null, FetchEventAnnotationsArgs, FetchEventAnnotationsOutput>;
/** @internal */
export interface FetchEventAnnotationsStartDependencies {
    aggs: AggsStart;
    dataViews: DataViewsContract;
    searchSource: ISearchStartSearchSource;
    getNow?: () => Date;
    uiSettings: IUiSettingsClient;
}
