import type { CoreSetup } from '@kbn/core/public';
import type { BehaviorSubject } from 'rxjs';
import type { DiscoverStartPlugins } from '../types';
import type { DiscoverEBTContextProps } from './types';
/**
 * Field usage events i.e. when a field is selected in the data table, removed from the data table, or a filter is added
 */
export declare const FIELD_USAGE_EVENT_TYPE = "discover_field_usage";
export declare const QUERY_FIELDS_USAGE_EVENT_TYPE = "discover_query_fields_usage";
export declare const FIELD_USAGE_EVENT_NAME = "eventName";
export declare const FIELD_USAGE_FIELD_NAME = "fieldName";
export declare const QUERY_FIELDS_USAGE_FIELD_NAMES = "fieldNames";
export declare const FIELD_USAGE_FILTER_OPERATION = "filterOperation";
/**
 * Contextual profile resolved event i.e. when a different contextual profile is resolved at root, data source, or document level
 * Duplicated events for the same profile level will not be sent.
 */
export declare const CONTEXTUAL_PROFILE_RESOLVED_EVENT_TYPE = "discover_profile_resolved";
export declare const CONTEXTUAL_PROFILE_LEVEL = "contextLevel";
export declare const CONTEXTUAL_PROFILE_ID = "profileId";
export declare const TABS_EVENT_TYPE = "discover_tabs";
/**
 * This function is statically imported since analytics registrations must happen at setup,
 * while the EBT manager is loaded dynamically when needed to avoid page load bundle bloat
 */
export declare const registerDiscoverEBTManagerAnalytics: (core: CoreSetup<DiscoverStartPlugins>, discoverEbtContext$: BehaviorSubject<DiscoverEBTContextProps>) => void;
