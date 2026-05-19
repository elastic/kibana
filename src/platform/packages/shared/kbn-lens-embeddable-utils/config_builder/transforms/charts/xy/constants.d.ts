export declare const XY_DATA_LAYER_TYPES: readonly ["area", "area_percentage", "area_stacked", "bar", "bar_horizontal", "bar_horizontal_stacked", "bar_horizontal_percentage", "bar_percentage", "bar_stacked", "line"];
export declare const XY_REFERENCE_LAYER_TYPES: readonly ["reference_lines"];
export declare const XY_ANNOTATION_LAYER_TYPES: readonly ["annotations", "annotation_group"];
export declare const AVAILABLE_XY_LAYER_TYPES: ("area" | "line" | "bar_stacked" | "annotations" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage" | "reference_lines" | "annotation_group")[];
export declare const DEFAULT_AXIS_TICKS_VISIBLE = true;
export declare const DEFAULT_AXIS_GRID_VISIBLE = true;
export declare const DEFAULT_AXIS_TITLE_VISIBLE = true;
export declare const DEFAULT_AXIS_LABELS_ORIENTATION: "horizontal";
export declare const DEFAULT_Y_AXIS_DOMAIN: {
    type: "full";
    rounding: true;
};
export declare const DEFAULT_X_AXIS_DOMAIN: {
    type: "fit";
    rounding: false;
};
