import type { TimeRange } from '@kbn/data-plugin/common';
import type { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { LineStyle } from '@kbn/visualization-ui-components';
import type { AvailableAnnotationIcon } from '@kbn/event-annotation-common';
import type { ManualEventAnnotationOutput, ManualPointEventAnnotationOutput, ManualRangeEventAnnotationOutput } from '../manual_event_annotation/types';
import type { QueryPointEventAnnotationOutput } from '../query_point_event_annotation/types';
import type { EventAnnotationOutput } from '../types';
export declare const isRangeAnnotation: (annotation: EventAnnotationOutput) => annotation is ManualRangeEventAnnotationOutput;
export declare const isManualPointAnnotation: (annotation: EventAnnotationOutput) => annotation is ManualPointEventAnnotationOutput;
export declare const isManualAnnotation: (annotation: EventAnnotationOutput) => annotation is ManualPointEventAnnotationOutput | ManualRangeEventAnnotationOutput;
export declare function toAbsoluteDates(range: TimeRange): {
    from: Date;
    to: Date;
} | undefined;
export declare const getCalculatedInterval: (uiSettings: IUiSettingsClient, usedInterval: string, timeRange?: TimeRange) => string | undefined;
export declare const isInRange: (annotation: ManualEventAnnotationOutput, timerange?: TimeRange) => boolean;
export declare const sortByTime: (a: DatatableRow, b: DatatableRow) => any;
export declare const wrapRowsInDatatable: (rows: DatatableRow[], columns?: DatatableColumn[]) => Datatable;
export declare const ANNOTATIONS_PER_BUCKET = 10;
export declare const postprocessAnnotations: (esaggsResponses: Array<{
    response: Datatable;
    fieldsColIdMap: Record<string, string>;
}>, queryAnnotationConfigs: QueryPointEventAnnotationOutput[], manualAnnotationDatatableRows: Array<{
    type: string;
    id: string;
    time: string;
    label: string;
    color?: string | undefined;
    icon?: AvailableAnnotationIcon | undefined;
    lineWidth?: number | undefined;
    lineStyle?: LineStyle | undefined;
    textVisibility?: boolean | undefined;
    isHidden?: boolean | undefined;
    timebucket: string;
}>) => Datatable;
