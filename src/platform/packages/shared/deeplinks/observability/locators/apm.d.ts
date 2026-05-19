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
