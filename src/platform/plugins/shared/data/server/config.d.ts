import type { TypeOf } from '@kbn/config-schema';
export declare const searchSessionsConfigSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * Turns the feature on \ off (incl. removing indicator and management screens)
     */
    enabled: import("@kbn/config-schema").Type<boolean>;
    /**
     * notTouchedTimeout controls how long user can save a session after all searches completed.
     * The client continues to poll searches to keep the alive until this timeout hits
     */
    notTouchedTimeout: import("@kbn/config-schema").Type<import("moment").Duration>;
    /**
     * maxUpdateRetries controls how many retries we perform while attempting to save a search session
     */
    maxUpdateRetries: import("@kbn/config-schema").Type<number>;
    /**
     * defaultExpiration controls how long search sessions are valid for, until they are expired.
     */
    defaultExpiration: import("@kbn/config-schema").Type<import("moment").Duration>;
    management: import("@kbn/config-schema").ObjectType<{
        /**
         * maxSessions controls how many saved search sessions we load on the management screen.
         */
        maxSessions: import("@kbn/config-schema").Type<number>;
        /**
         * refreshInterval controls how often we refresh the management screen. 0s as duration means that auto-refresh is turned off.
         */
        refreshInterval: import("@kbn/config-schema").Type<import("moment").Duration>;
        /**
         * refreshTimeout controls the timeout for loading search sessions on mgmt screen
         */
        refreshTimeout: import("@kbn/config-schema").Type<import("moment").Duration>;
        expiresSoonWarning: import("@kbn/config-schema").Type<import("moment").Duration>;
    }>;
}>;
export declare const searchConfigSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * Config for search strategies that use async search based API underneath
     */
    asyncSearch: import("@kbn/config-schema").ObjectType<{
        /**
         *  Block and wait until the search is completed up to the timeout (see es async_search's `wait_for_completion_timeout`)
         */
        waitForCompletion: import("@kbn/config-schema").Type<import("moment").Duration>;
        /**
         *  How long the async search needs to be available after each search poll. Ongoing async searches and any saved search results are deleted after this period.
         *  (see es async_search's `keep_alive`)
         *  Note: This is applicable to the searches before the search session is saved.
         *  After search session is saved `keep_alive` is extended using `data.search.sessions.defaultExpiration` config
         */
        keepAlive: import("@kbn/config-schema").Type<import("moment").Duration>;
        /**
         * Affects how often partial results become available, which happens whenever shard results are reduced (see es async_search's `batched_reduce_size`)
         */
        batchedReduceSize: import("@kbn/config-schema").Type<number>;
        /**
         * How long to wait before polling the async_search after the previous poll response.
         * If not provided, defaults to zero.
         */
        pollInterval: import("@kbn/config-schema").Type<number | undefined>;
        /**
         * How long to wait for results before initiating a new poll request.
         * Accepts duration format (e.g., "30s", "100ms"). If not provided,
         * defaults to protocol-specific behavior (30s for HTTP/2 or HTTP/3).
         */
        pollLength: import("@kbn/config-schema").Type<import("moment").Duration | undefined>;
    }>;
    aggs: import("@kbn/config-schema").ObjectType<{
        shardDelay: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").Type<boolean>;
        }>;
    }>;
    sessions: import("@kbn/config-schema").ObjectType<{
        /**
         * Turns the feature on \ off (incl. removing indicator and management screens)
         */
        enabled: import("@kbn/config-schema").Type<boolean>;
        /**
         * notTouchedTimeout controls how long user can save a session after all searches completed.
         * The client continues to poll searches to keep the alive until this timeout hits
         */
        notTouchedTimeout: import("@kbn/config-schema").Type<import("moment").Duration>;
        /**
         * maxUpdateRetries controls how many retries we perform while attempting to save a search session
         */
        maxUpdateRetries: import("@kbn/config-schema").Type<number>;
        /**
         * defaultExpiration controls how long search sessions are valid for, until they are expired.
         */
        defaultExpiration: import("@kbn/config-schema").Type<import("moment").Duration>;
        management: import("@kbn/config-schema").ObjectType<{
            /**
             * maxSessions controls how many saved search sessions we load on the management screen.
             */
            maxSessions: import("@kbn/config-schema").Type<number>;
            /**
             * refreshInterval controls how often we refresh the management screen. 0s as duration means that auto-refresh is turned off.
             */
            refreshInterval: import("@kbn/config-schema").Type<import("moment").Duration>;
            /**
             * refreshTimeout controls the timeout for loading search sessions on mgmt screen
             */
            refreshTimeout: import("@kbn/config-schema").Type<import("moment").Duration>;
            expiresSoonWarning: import("@kbn/config-schema").Type<import("moment").Duration>;
        }>;
    }>;
}>;
export declare const queryConfigSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * Config for timefilter
     */
    timefilter: import("@kbn/config-schema").ObjectType<{
        /**
         * Lower limit of refresh interval (in milliseconds)
         */
        minRefreshInterval: import("@kbn/config-schema").ConditionalType<true, number, number>;
    }>;
}>;
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    query: import("@kbn/config-schema").ObjectType<{
        /**
         * Config for timefilter
         */
        timefilter: import("@kbn/config-schema").ObjectType<{
            /**
             * Lower limit of refresh interval (in milliseconds)
             */
            minRefreshInterval: import("@kbn/config-schema").ConditionalType<true, number, number>;
        }>;
    }>;
    search: import("@kbn/config-schema").ObjectType<{
        /**
         * Config for search strategies that use async search based API underneath
         */
        asyncSearch: import("@kbn/config-schema").ObjectType<{
            /**
             *  Block and wait until the search is completed up to the timeout (see es async_search's `wait_for_completion_timeout`)
             */
            waitForCompletion: import("@kbn/config-schema").Type<import("moment").Duration>;
            /**
             *  How long the async search needs to be available after each search poll. Ongoing async searches and any saved search results are deleted after this period.
             *  (see es async_search's `keep_alive`)
             *  Note: This is applicable to the searches before the search session is saved.
             *  After search session is saved `keep_alive` is extended using `data.search.sessions.defaultExpiration` config
             */
            keepAlive: import("@kbn/config-schema").Type<import("moment").Duration>;
            /**
             * Affects how often partial results become available, which happens whenever shard results are reduced (see es async_search's `batched_reduce_size`)
             */
            batchedReduceSize: import("@kbn/config-schema").Type<number>;
            /**
             * How long to wait before polling the async_search after the previous poll response.
             * If not provided, defaults to zero.
             */
            pollInterval: import("@kbn/config-schema").Type<number | undefined>;
            /**
             * How long to wait for results before initiating a new poll request.
             * Accepts duration format (e.g., "30s", "100ms"). If not provided,
             * defaults to protocol-specific behavior (30s for HTTP/2 or HTTP/3).
             */
            pollLength: import("@kbn/config-schema").Type<import("moment").Duration | undefined>;
        }>;
        aggs: import("@kbn/config-schema").ObjectType<{
            shardDelay: import("@kbn/config-schema").ObjectType<{
                enabled: import("@kbn/config-schema").Type<boolean>;
            }>;
        }>;
        sessions: import("@kbn/config-schema").ObjectType<{
            /**
             * Turns the feature on \ off (incl. removing indicator and management screens)
             */
            enabled: import("@kbn/config-schema").Type<boolean>;
            /**
             * notTouchedTimeout controls how long user can save a session after all searches completed.
             * The client continues to poll searches to keep the alive until this timeout hits
             */
            notTouchedTimeout: import("@kbn/config-schema").Type<import("moment").Duration>;
            /**
             * maxUpdateRetries controls how many retries we perform while attempting to save a search session
             */
            maxUpdateRetries: import("@kbn/config-schema").Type<number>;
            /**
             * defaultExpiration controls how long search sessions are valid for, until they are expired.
             */
            defaultExpiration: import("@kbn/config-schema").Type<import("moment").Duration>;
            management: import("@kbn/config-schema").ObjectType<{
                /**
                 * maxSessions controls how many saved search sessions we load on the management screen.
                 */
                maxSessions: import("@kbn/config-schema").Type<number>;
                /**
                 * refreshInterval controls how often we refresh the management screen. 0s as duration means that auto-refresh is turned off.
                 */
                refreshInterval: import("@kbn/config-schema").Type<import("moment").Duration>;
                /**
                 * refreshTimeout controls the timeout for loading search sessions on mgmt screen
                 */
                refreshTimeout: import("@kbn/config-schema").Type<import("moment").Duration>;
                expiresSoonWarning: import("@kbn/config-schema").Type<import("moment").Duration>;
            }>;
        }>;
    }>;
    /**
     * Turns on/off limit validations for the registered uiSettings.
     */
    enableUiSettingsValidations: import("@kbn/config-schema").Type<boolean>;
}>;
export type ConfigSchema = TypeOf<typeof configSchema>;
export type SearchConfigSchema = TypeOf<typeof searchConfigSchema>;
export type QueryConfigSchema = TypeOf<typeof queryConfigSchema>;
export type SearchSessionsConfigSchema = TypeOf<typeof searchSessionsConfigSchema>;
