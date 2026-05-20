import type { $Values } from '@kbn/utility-types';
import type { AggConfigs } from '@kbn/data-plugin/common';
export declare const CHARTS_WITHOUT_SMALL_MULTIPLES: {
    readonly gauge: "gauge";
};
export declare const CHARTS_TO_BE_DEPRECATED: {
    readonly pie: "pie";
    readonly controls: "input_control_vis";
};
export type CHARTS_WITHOUT_SMALL_MULTIPLES = $Values<typeof CHARTS_WITHOUT_SMALL_MULTIPLES>;
export type CHARTS_TO_BE_DEPRECATED = $Values<typeof CHARTS_TO_BE_DEPRECATED>;
export declare const CHARTS_CONFIG_TOKENS: {
    readonly gauge: "visualization:visualize:legacyGaugeChartsLibrary";
};
export declare const isSplitChart: (chartType: string | undefined, aggs?: AggConfigs) => boolean | undefined;
