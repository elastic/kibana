import React from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core/public';
import type { LatencyAggregationType } from '@kbn/apm-types';
import type { SharePluginStart } from '@kbn/share-plugin/public';
interface ServiceFlyoutTransactionsSectionProps {
    http: HttpStart;
    notifications: NotificationsStart;
    serviceName: string;
    environment: string;
    start: string;
    end: string;
    transactionType?: string;
    latencyAggregationType?: LatencyAggregationType;
    locators?: SharePluginStart['url']['locators'];
    refreshToken?: number;
}
export declare function ServiceFlyoutTransactionsSection({ http, notifications, serviceName, environment, start, end, transactionType, latencyAggregationType, locators, refreshToken, }: ServiceFlyoutTransactionsSectionProps): React.JSX.Element;
export {};
