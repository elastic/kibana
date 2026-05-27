/**
 * @deprecated This should only be used in combination with {@link isEsqlSavedSearch}
 */
export interface DiscoverSessionFinderAttributes {
    tabs?: Array<{
        attributes: {
            isTextBasedQuery?: boolean;
        };
    }>;
}
/**
 * @deprecated This is only used in specific legacy conditions:
 * - Within a `showSavedObject` callback passed to `SavedObjectFinder`
 * - When the Discover session is being used as a legacy saved search
 * - When the app does not support ES|QL saved searches (e.g. agg-based vis)
 */
export declare const isEsqlSavedSearch: (savedObject: {
    attributes: DiscoverSessionFinderAttributes;
}) => boolean;
