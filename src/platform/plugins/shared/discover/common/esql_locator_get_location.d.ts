import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { HttpStart } from '@kbn/core/public';
import type { DiscoverESQLLocatorGetLocation } from './esql_locator';
export declare const esqlLocatorGetLocation: ({ discoverAppLocator, dataViews, http, }: {
    discoverAppLocator: LocatorPublic<SerializableRecord>;
    dataViews: DataViewsPublicPluginStart;
    http: HttpStart;
}) => ReturnType<DiscoverESQLLocatorGetLocation>;
