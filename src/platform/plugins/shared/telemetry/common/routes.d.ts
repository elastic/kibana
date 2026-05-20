export declare const INTERNAL_VERSION: {
    version: string;
};
/**
 * Fetch Telemetry Config
 * @public Kept public and path-based because we know other Elastic products fetch the opt-in status via this endpoint.
 */
export declare const FetchTelemetryConfigRoutePathBasedV2 = "/api/telemetry/v2/config";
/**
 * Fetch Telemetry Config
 * @internal
 */
export declare const FetchTelemetryConfigRoute = "/internal/telemetry/config";
/**
 * GET/PUT Last reported date for Snapshot telemetry
 * @internal
 */
export declare const LastReportedRoute = "/internal/telemetry/last_reported";
/**
 * Set user has seen notice
 * @internal
 */
export declare const UserHasSeenNoticeRoute = "/internal/telemetry/userHasSeenNotice";
/**
 * Set opt-in/out status
 * @internal
 */
export declare const OptInRoute = "/internal/telemetry/optIn";
/**
 * Fetch the Snapshot telemetry report
 * @internal
 */
export declare const FetchSnapshotTelemetry = "/internal/telemetry/clusters/_stats";
/**
 * Get Opt-in stats
 * @internal
 * @deprecated
 */
export declare const GetOptInStatsRoutePathBasedV2 = "/api/telemetry/v2/clusters/_opt_in_stats";
