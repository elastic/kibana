import React from 'react';
import { Position } from '@elastic/charts';
import type { EventAnnotationOutput, ManualRangeEventAnnotationRow, PointEventAnnotationRow } from '@kbn/event-annotation-plugin/common';
import type { FormatFactory } from '@kbn/field-formats-plugin/common';
import type { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import type { MergedAnnotation } from '../../common';
export interface AnnotationsProps {
    groupedLineAnnotations: MergedAnnotation[];
    rangeAnnotations: ManualRangeEventAnnotationRow[];
    timeFormat?: string;
    isHorizontal: boolean;
    paddingMap: Partial<Record<Position, number>>;
    simpleView?: boolean;
    minInterval?: number;
    isBarChart?: boolean;
    outsideDimension: number;
}
export declare const isRangeAnnotation: (row: DatatableRow) => row is ManualRangeEventAnnotationRow;
export declare const getRangeAnnotations: (datatable: Datatable) => ManualRangeEventAnnotationRow[];
export declare const OUTSIDE_RECT_ANNOTATION_WIDTH = 8;
export declare const OUTSIDE_RECT_ANNOTATION_WIDTH_SUGGESTION = 2;
export declare const getAnnotationsGroupedByInterval: (annotations: PointEventAnnotationRow[], configs: EventAnnotationOutput[] | undefined, columns: DatatableColumn[] | undefined, formatFactory: FormatFactory, timeFormat: string, isDarkMode: boolean) => MergedAnnotation[];
export declare const Annotations: ({ groupedLineAnnotations, rangeAnnotations, timeFormat, isHorizontal, paddingMap, simpleView, minInterval, isBarChart, outsideDimension, }: AnnotationsProps) => React.JSX.Element;
