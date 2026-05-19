import React from 'react';
import { type QueryInputServices } from '@kbn/visualization-ui-components';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { EventAnnotationConfig } from '@kbn/event-annotation-common';
export interface Props {
    annotation: EventAnnotationConfig;
    onAnnotationChange: (annotation: EventAnnotationConfig) => void;
    dataView: DataView;
    getDefaultRangeEnd: (rangeStart: string) => string;
    calendarClassName?: string;
    queryInputServices: QueryInputServices;
    appName: string;
}
export declare const idPrefix: string;
declare const AnnotationEditorControls: ({ annotation: currentAnnotation, onAnnotationChange, dataView, getDefaultRangeEnd, calendarClassName, queryInputServices, appName, }: Props) => React.JSX.Element;
export default AnnotationEditorControls;
