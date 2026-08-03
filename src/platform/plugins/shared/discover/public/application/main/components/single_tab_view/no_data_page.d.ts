import React from 'react';
import type { AnalyticsNoDataPageProps } from '@kbn/shared-ux-page-analytics-no-data-types';
import type { DiscoverInternalState } from '../../state_management/redux';
export declare const NoDataPage: ({ hasESData, hasUserDataView, onDataViewCreated, onESQLNavigationComplete, }: DiscoverInternalState["initializationState"] & AnalyticsNoDataPageProps) => React.JSX.Element;
