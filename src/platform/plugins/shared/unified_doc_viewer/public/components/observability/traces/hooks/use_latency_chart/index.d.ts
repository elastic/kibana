import type { EuiThemeComputed } from '@elastic/eui';
import type { HistogramItem } from '@kbn/apm-types-shared';
import type { DurationDistributionChartData } from '@kbn/apm-ui-shared';
interface GetTransactionDistributionChartDataParams {
    euiTheme: EuiThemeComputed;
    transactionHistogram?: HistogramItem[];
}
export declare function getTransactionDistributionChartData({ euiTheme, transactionHistogram, }: GetTransactionDistributionChartDataParams): DurationDistributionChartData[];
export interface LatencyChartData {
    distributionChartData: DurationDistributionChartData[];
    percentileThresholdValue?: number;
}
interface GetSpanDistributionChartDataParams {
    euiTheme: EuiThemeComputed;
    spanHistogram?: HistogramItem[];
}
export declare const getSpanDistributionChartData: ({ euiTheme, spanHistogram, }: GetSpanDistributionChartDataParams) => DurationDistributionChartData[];
interface UseLatencyChartParams {
    spanName?: string;
    serviceName?: string;
    transactionName?: string;
    transactionType?: string;
    isOtelSpan?: boolean;
}
export declare const useLatencyChart: ({ spanName, serviceName, transactionName, transactionType, isOtelSpan, }: UseLatencyChartParams) => {
    loading: boolean;
    hasError: boolean;
    data: LatencyChartData | undefined;
};
export {};
