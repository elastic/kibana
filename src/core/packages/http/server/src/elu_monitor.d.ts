/**
 * HTTP request ELU monitor config
 * @public
 */
export interface IHttpEluMonitorConfig {
    /**
     * Whether the monitoring of event loop utilization for HTTP requests is enabled.
     */
    readonly enabled: boolean;
    readonly logging: {
        /**
         * Whether to log ELU + ELA violations. Both `.elu` and `.ela` need to be exceeded for it to be considered a violation.
         */
        readonly enabled: boolean;
        readonly threshold: {
            /**
             * The minimum percentage of the request duration that needs to be exceeded (needs to be between 0 and 1)
             */
            readonly elu: number;
            /**
             * The minimum number of milliseconds the event loop was active for the duration of the request.
             */
            readonly ela: number;
        };
    };
}
