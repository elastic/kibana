import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core/public';
import type { LatencyAggregationType } from '@kbn/apm-types';
import type { TransactionGroup } from '../../../transactions_table/types';
export declare function useServiceFlyoutTransactionData({ http, notifications, serviceName, environment, start, end, transactionType, latencyAggregationType, searchQuery, refreshToken, offset, }: {
    http: HttpStart;
    notifications: NotificationsStart;
    serviceName: string;
    environment: string;
    start: string;
    end: string;
    transactionType?: string;
    latencyAggregationType?: LatencyAggregationType;
    searchQuery: string;
    refreshToken?: number;
    offset?: string;
}): {
    items: TransactionGroup[];
    isLoading: boolean;
    isSparklineLoading: boolean;
    maxCountExceeded: boolean;
    hasActiveAlerts: boolean;
    error: unknown;
};
