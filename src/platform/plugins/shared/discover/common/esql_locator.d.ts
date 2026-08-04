import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
export type DiscoverESQLLocatorParams = SerializableRecord;
export type DiscoverESQLLocator = LocatorPublic<DiscoverESQLLocatorParams>;
export type DiscoverESQLLocatorGetLocation = LocatorDefinition<DiscoverESQLLocatorParams>['getLocation'];
