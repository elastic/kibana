import type { GaugeShape } from '@kbn/expression-gauge-plugin/common';
export declare const LENS_GAUGE_ID = "lnsGauge";
export declare const GAUGE_SHAPES: {
    readonly HORIZONTAL_BULLET: "horizontalBullet";
    readonly VERTICAL_BULLET: "verticalBullet";
    readonly SEMI_CIRCLE: "semiCircle";
    readonly ARC: "arc";
    readonly CIRCLE: "circle";
};
export declare const GAUGE_TICKS_POSITIONS: {
    readonly HIDDEN: "hidden";
    readonly AUTO: "auto";
    readonly BANDS: "bands";
};
export declare const GAUGE_LABEL_MAJOR_MODES: {
    readonly AUTO: "auto";
    readonly CUSTOM: "custom";
    readonly NONE: "none";
};
export declare const GAUGE_CENTRAL_MAJOR_MODES: {
    readonly AUTO: "auto";
    readonly CUSTOM: "custom";
    readonly NONE: "none";
};
export declare const GAUGE_COLOR_MODES: {
    readonly PALETTE: "palette";
    readonly NONE: "none";
};
export declare const LENS_GAUGE_GROUP_ID: {
    readonly METRIC: "metric";
    readonly MIN: "min";
    readonly MAX: "max";
    readonly GOAL: "goal";
};
export declare const GAUGE_TITLES_BY_TYPE: Record<GaugeShape, string>;
