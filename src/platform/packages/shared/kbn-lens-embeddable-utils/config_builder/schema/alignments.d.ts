declare const HORIZONTAL_ALIGN: readonly ["left", "center", "right"];
declare const VERTICAL_ALIGN: readonly ["top", "bottom"];
declare const LR_ALIGN: readonly ["left", "right"];
declare const BEFORE_AFTER_ALIGN: readonly ["before", "after"];
type Position = 'top' | 'bottom' | 'left' | 'right';
type HorizontalAlignment = (typeof HORIZONTAL_ALIGN)[number];
type VerticalAlignment = (typeof VERTICAL_ALIGN)[number];
type LeftRightAlignment = (typeof LR_ALIGN)[number];
type BeforeAfterAlignment = (typeof BEFORE_AFTER_ALIGN)[number];
interface Options<T extends string> {
    defaultValue?: T;
    meta?: {
        description: string;
    };
}
export declare const horizontalAlignmentSchema: (opts?: Options<HorizontalAlignment>) => import("@kbn/config-schema").Type<"left" | "right" | "center">;
export declare const verticalAlignmentSchema: (opts?: Options<VerticalAlignment>) => import("@kbn/config-schema").Type<"top" | "bottom">;
export declare const leftRightAlignmentSchema: (opts?: Options<LeftRightAlignment>) => import("@kbn/config-schema").Type<"left" | "right">;
export declare const positionSchema: (opts?: Options<Position>) => import("@kbn/config-schema").Type<"left" | "right" | "top" | "bottom">;
export declare const beforeAfterAlignmentSchema: (opts?: Options<BeforeAfterAlignment>) => import("@kbn/config-schema").Type<"after" | "before">;
export {};
