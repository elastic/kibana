import type { AggregateQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { HttpStart } from '@kbn/core-http-browser';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
export declare function getEsqlDataView(query: AggregateQuery, currentDataView: DataView | undefined, services: {
    dataViews: DataViewsPublicPluginStart;
    http: HttpStart;
}): Promise<DataView>;
