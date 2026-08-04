import type { KibanaQueryOutput } from '@kbn/data-plugin/common';
import type { PointStyleProps } from '@kbn/event-annotation-common';
export type QueryPointEventAnnotationArgs = {
    id: string;
    filter: KibanaQueryOutput;
    timeField?: string;
    extraFields?: string[];
    textField?: string;
} & PointStyleProps;
export type QueryPointEventAnnotationOutput = QueryPointEventAnnotationArgs & {
    type: 'query_point_event_annotation';
};
