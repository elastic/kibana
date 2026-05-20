import type { AggregateQuery } from '@kbn/es-query';
import type { CoreStart, ToastsStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { Rule } from '@kbn/alerting-plugin/common';
import type { RuleTypeParams } from '@kbn/alerting-plugin/common';
import type { ISearchSource, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DiscoverAppLocatorParams } from '../../../common/app_locator';
export interface SearchThresholdAlertParams extends RuleTypeParams {
    searchConfiguration: SerializedSearchSourceFields;
    esqlQuery?: AggregateQuery;
    timeField?: string;
}
export interface QueryParams {
    from: string | null;
    to: string | null;
}
export declare const getAlertUtils: (openActualAlert: boolean, queryParams: QueryParams, toastNotifications: ToastsStart, core: CoreStart, data: DataPublicPluginStart, dataViews: DataViewsPublicPluginStart) => {
    fetchAlert: (id: string) => Promise<Rule<SearchThresholdAlertParams>>;
    fetchSearchSource: (fetchedAlert: Rule<SearchThresholdAlertParams>) => Promise<{
        alert: Rule<SearchThresholdAlertParams>;
        searchSource: ISearchSource;
    }>;
    buildLocatorParams: ({ alert, searchSource, }: {
        alert: Rule<SearchThresholdAlertParams>;
        searchSource: ISearchSource;
    }) => Promise<DiscoverAppLocatorParams>;
};
