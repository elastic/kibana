import React from 'react';
import type { AnalyticsNoDataPageProps } from '@kbn/shared-ux-page-analytics-no-data-types';
/**
 * An entire page that can be displayed when Kibana "has no data", specifically for Analytics.  Uses
 * services from a Provider to supply props to a pure component.
 */
export declare const AnalyticsNoDataPage: ({ onDataViewCreated, allowAdHocDataView, onTryESQL, onESQLNavigationComplete, }: AnalyticsNoDataPageProps) => React.JSX.Element;
