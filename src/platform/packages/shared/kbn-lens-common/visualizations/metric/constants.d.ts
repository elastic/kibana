import type { MetricLayoutWithDefault, MetricStateDefaults, MetricStyleTemplatePresetId } from './types';
export declare const LENS_METRIC_ID = "lnsMetric";
export declare const LENS_METRIC_GROUP_ID: {
    readonly METRIC: "metric";
    readonly SECONDARY_METRIC: "secondaryMetric";
    readonly MAX: "max";
    readonly BREAKDOWN_BY: "breakdownBy";
    readonly TREND_METRIC: "trendMetric";
    readonly TREND_SECONDARY_METRIC: "trendSecondaryMetric";
    readonly TREND_TIME: "trendTime";
    readonly TREND_BREAKDOWN_BY: "trendBreakdownBy";
};
export declare const LENS_LEGACY_METRIC_STATE_DEFAULTS: Pick<MetricStateDefaults, 'iconAlign'>;
/**
 * Style template presets by primary metric position
 */
export declare const LENS_METRIC_STYLE_TEMPLATE: Record<MetricStyleTemplatePresetId, Required<MetricLayoutWithDefault>>;
export declare const LENS_METRIC_DEFAULT_STYLE_TEMPLATE_CONFIG: Required<MetricLayoutWithDefault>;
/**
 * Defaults for select optional Metric vis state options
 */
export declare const LENS_METRIC_STATE_DEFAULTS: MetricStateDefaults;
export declare const LENS_METRIC_SECONDARY_DEFAULT_STATIC_COLOR = "#E4E8F1";
export declare const LENS_METRIC_DEFAULT_TRENDLINE_NAME = "default";
export declare const LENS_METRIC_TRENDLINE_NAME = "metricTrendline";
export declare const LENS_METRIC_LABEL_POSITION: {
    readonly BOTTOM: "bottom";
    readonly TOP: "top";
};
export declare const LENS_METRIC_SECONDARY_BASELINE_DEFAULT_VALUE = 0;
export declare const LENS_METRIC_BREAKDOWN_DEFAULT_MAX_COLUMNS = 3;
export declare const LENS_METRIC_AVAILABLE_METRIC_ICONS: {
    readonly EMPTY: "empty";
    readonly SORTUP: "sortUp";
    readonly SORTDOWN: "sortDown";
    readonly COMPUTE: "compute";
    readonly ASTERISK: "asterisk";
    readonly ALERT: "alert";
    readonly BELL: "bell";
    readonly BOLT: "bolt";
    readonly BUG: "bug";
    readonly EDITOR_COMMENT: "editorComment";
    readonly FLAG: "flag";
    readonly HEART: "heart";
    readonly MAP_MARKER: "mapMarker";
    readonly PIN: "pin";
    readonly STAR_EMPTY: "starEmpty";
    readonly TAG: "tag";
    readonly GLOBE: "globe";
    readonly TEMPERATURE: "temperature";
};
export declare const LENS_EXPRESSION_METRIC_TRENDLINE_NAME = "metricTrendline";
