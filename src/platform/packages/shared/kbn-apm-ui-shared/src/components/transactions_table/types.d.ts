import type { EbtClickAttrs } from '@kbn/ebt-click';
import type { SparklinePoint } from '../sparkline/utils';
interface MetricSeries {
    value: SparklinePoint[];
    comparison?: SparklinePoint[];
}
export interface TransactionMetric {
    value: number | null;
    series?: MetricSeries;
}
export interface TransactionGroupInteraction {
    onClick?: (item: TransactionGroup) => void;
    href?: (item: TransactionGroup) => string | undefined;
    ebt?: Pick<EbtClickAttrs, 'element'>;
}
export interface TransactionsTableHeaderAction {
    label: string;
    icon?: string;
    href?: string;
    onClick?: () => void;
    ebt: EbtClickAttrs;
}
export interface TransactionGroup {
    name: string;
    transactionType?: string;
    environment?: string;
    latency: TransactionMetric;
    throughput: TransactionMetric;
    errorRate: TransactionMetric;
    alertsCount?: number;
    impact?: {
        value: number;
        comparison?: number;
    };
}
export {};
