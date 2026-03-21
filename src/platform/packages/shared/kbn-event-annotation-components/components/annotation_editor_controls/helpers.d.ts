import type { EventAnnotationConfig, RangeEventAnnotationConfig, PointInTimeEventAnnotationConfig, QueryPointEventAnnotationConfig } from '@kbn/event-annotation-common';
export declare const defaultAnnotationColor: string;
export declare const defaultAnnotationRangeColor = "#F04E981A";
export declare const defaultAnnotationLabel: string;
export declare const defaultRangeAnnotationLabel: string;
export declare const toRangeAnnotationColor: (color?: string) => string;
export declare const toLineAnnotationColor: (color?: string) => string;
export declare const sanitizeProperties: (annotation: EventAnnotationConfig) => PointInTimeEventAnnotationConfig | RangeEventAnnotationConfig | QueryPointEventAnnotationConfig;
