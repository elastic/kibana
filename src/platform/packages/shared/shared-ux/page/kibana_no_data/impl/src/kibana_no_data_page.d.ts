import React from 'react';
import type { KibanaNoDataPageProps } from '@kbn/shared-ux-page-kibana-no-data-types';
/**
 * A page to display when Kibana has no data, prompting a person to add integrations or create a new data view.
 */
export declare const KibanaNoDataPage: ({ onDataViewCreated, noDataConfig, allowAdHocDataView, onTryESQL, onESQLNavigationComplete, showPlainSpinner, }: KibanaNoDataPageProps) => React.JSX.Element | null;
