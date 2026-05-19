declare const HORIZONTAL_ALIGN: readonly ["left", "center", "right"];
declare const VERTICAL_ALIGN: readonly ["top", "bottom"];
declare const METRIC_VALUE_POSITION: readonly ["top", "middle", "bottom"];
declare const LR_ALIGN: readonly ["left", "right"];
declare const BEFORE_AFTER_ALIGN: readonly ["before", "after"];
declare const POSITION: readonly ["top", "bottom", "left", "right"];
declare const CORNER_POSITION: readonly ["top_left", "top_right", "bottom_left", "bottom_right"];
type Position = (typeof POSITION)[number];
type CornerPosition = (typeof CORNER_POSITION)[number];
type HorizontalAlignment = (typeof HORIZONTAL_ALIGN)[number];
type VerticalAlignment = (typeof VERTICAL_ALIGN)[number];
type MetricValuePosition = (typeof METRIC_VALUE_POSITION)[number];
type LeftRightAlignment = (typeof LR_ALIGN)[number];
type BeforeAfterAlignment = (typeof BEFORE_AFTER_ALIGN)[number];
interface Options<T extends string> {
    defaultValue?: T;
    meta?: {
        description: string;
    };
}
export declare const horizontalAlignmentSchema: (opts?: Options<HorizontalAlignment>) => import("@kbn/config-schema").Type<"right" | "left" | "center">;
export declare const verticalAlignmentSchema: (opts?: Options<VerticalAlignment>) => import("@kbn/config-schema").Type<"top" | "bottom">;
export declare const metricValuePositionSchema: (opts?: Options<MetricValuePosition>) => import("@kbn/config-schema").Type<"top" | "bottom" | "middle">;
export declare const leftRightAlignmentSchema: (opts?: Options<LeftRightAlignment>) => import("@kbn/config-schema").Type<"right" | "left">;
export declare const positionSchema: (opts?: Options<Position>) => import("@kbn/config-schema").Type<"right" | "top" | "left" | "bottom">;
export declare const cornerPositionSchema: (opts?: Options<CornerPosition>) => import("@kbn/config-schema").Type<"top_left" | "bottom_right" | "top_right" | "bottom_left">;
export declare const placementSchema: (opts?: Options<BeforeAfterAlignment>) => import("@kbn/config-schema").Type<"before" | "after">;
export {};
