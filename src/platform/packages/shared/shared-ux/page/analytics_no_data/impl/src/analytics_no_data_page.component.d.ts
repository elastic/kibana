import React from 'react';
import type { Services } from '@kbn/shared-ux-page-analytics-no-data-types';
/**
 * Props for the pure component.
 */
export interface Props {
    /** Handler for successfully creating a new data view. */
    onDataViewCreated: (dataView: unknown) => void;
    /** if set to true allows creation of an ad-hoc dataview from data view editor */
    allowAdHocDataView?: boolean;
    /** if the kibana instance is customly branded */
    showPlainSpinner: boolean;
    /** If the cluster has data, this handler allows the user to try ES|QL */
    onTryESQL?: () => void;
    /** Handler for when try ES|QL is clicked and user has been navigated to try ES|QL in discover. */
    onESQLNavigationComplete?: () => void;
}
type AnalyticsNoDataPageProps = Props & Pick<Services, 'getHttp' | 'prependBasePath' | 'kibanaGuideDocLink' | 'pageFlavor'>;
/**
 * A pure component of an entire page that can be displayed when Kibana "has no data", specifically for Analytics.
 */
export declare const AnalyticsNoDataPage: React.FC<AnalyticsNoDataPageProps>;
export {};
