import type { PointStyleProps, RangeStyleProps } from '@kbn/event-annotation-common';
export type ManualPointEventAnnotationArgs = {
    id: string;
    time: string;
} & PointStyleProps;
export type ManualPointEventAnnotationOutput = ManualPointEventAnnotationArgs & {
    type: 'manual_point_event_annotation';
};
export type PointEventAnnotationRow = {
    id: string;
    time: string;
    type: 'point';
    timebucket: string;
    skippedCount?: number;
} & PointStyleProps & Record<string, any>;
export type ManualRangeEventAnnotationArgs = {
    id: string;
    time: string;
    endTime: string;
} & RangeStyleProps;
export type ManualRangeEventAnnotationRow = {
    id: string;
    time: string;
    endTime: string;
    type: 'range';
} & RangeStyleProps;
export type ManualRangeEventAnnotationOutput = ManualRangeEventAnnotationArgs & {
    type: 'manual_range_event_annotation';
};
export type ManualEventAnnotationOutput = ManualPointEventAnnotationOutput | ManualRangeEventAnnotationOutput;
