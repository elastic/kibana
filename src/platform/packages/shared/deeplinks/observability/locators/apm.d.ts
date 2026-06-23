import type { SerializableRecord } from '@kbn/utility-types';
export declare const TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR = "TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR";
export interface TransactionDetailsByTraceIdLocatorParams extends SerializableRecord {
    rangeFrom?: string;
    rangeTo?: string;
    waterfallItemId?: string;
    traceId: string;
}
export declare const DEPENDENCY_OVERVIEW_LOCATOR_ID = "dependencyOverviewLocator";
export interface DependencyOverviewParams extends SerializableRecord {
    dependencyName: string;
    environment?: string;
    rangeFrom?: string;
    rangeTo?: string;
}
export declare const TRANSACTION_DETAILS_BY_NAME_LOCATOR = "TransactionDetailsByNameLocator";
export interface TransactionDetailsByNameParams extends SerializableRecord {
    serviceName: string;
    transactionName: string;
    rangeFrom?: string;
    rangeTo?: string;
}
export declare const SERVICE_TRANSACTIONS_LOCATOR_ID = "serviceTransactionsLocator";
export interface ServiceTransactionsLocatorParams extends SerializableRecord {
    serviceName: string;
    transactionType?: string;
    environment?: string;
    rangeFrom?: string;
    rangeTo?: string;
    latencyAggregationType?: string;
}
export declare const SERVICE_ALERTS_LOCATOR_ID = "serviceAlertsLocator";
export interface ServiceAlertsLocatorParams extends SerializableRecord {
    serviceName: string;
    transactionName?: string;
    transactionType?: string;
    kuery?: string;
    rangeFrom?: string;
    rangeTo?: string;
}
