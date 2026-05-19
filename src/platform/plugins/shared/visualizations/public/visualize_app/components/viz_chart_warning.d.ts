import type { FC } from 'react';
import type { CHARTS_WITHOUT_SMALL_MULTIPLES as CHART_WITHOUT_SMALL_MULTIPLES, CHARTS_TO_BE_DEPRECATED as CHART_TO_BE_DEPRECATED } from '../utils/split_chart_warning_helpers';
interface Props {
    chartType: CHART_WITHOUT_SMALL_MULTIPLES | CHART_TO_BE_DEPRECATED;
    chartConfigToken?: string;
    mode?: 'old' | 'new';
}
export declare const VizChartWarning: FC<Props>;
export {};
