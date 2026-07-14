/**
 * The current status of a service at a point in time.
 *
 * @typeParam Meta - JSON-serializable object. Plugins should export this type to allow other plugins to read the `meta`
 *                   field in a type-safe way.
 * @public
 */
export interface ServiceStatus<Meta extends Record<string, any> | unknown = unknown> {
    /**
     * The current availability level of the service.
     */
    level: ServiceStatusLevel;
    /**
     * A high-level summary of the service status.
     */
    summary: string;
    /**
     * A more detailed description of the service status.
     */
    detail?: string;
    /**
     * A URL to open in a new tab about how to resolve or troubleshoot the problem.
     */
    documentationUrl?: string;
    /**
     * Any JSON-serializable data to be included in the HTTP API response. Useful for providing more fine-grained,
     * machine-readable information about the service status. May include status information for underlying features.
     */
    meta?: Meta;
}
/**
 * Possible values for the ID of a {@link ServiceStatusLevel}
 *
 * @public
 */
export type ServiceStatusLevelId = 'available' | 'degraded' | 'unavailable' | 'critical';
/**
 * The current "level" of availability of a service.
 *
 * @remarks
 * The values implement `valueOf` to allow for easy comparisons between status levels with <, >, etc. Higher values
 * represent higher severities. Note that the default `Array.prototype.sort` implementation does not correctly sort
 * these values.
 *
 * A snapshot serializer is available in `src/core/server/test_utils` to ease testing of these values with Jest.
 *
 * @public
 */
export declare const ServiceStatusLevels: Readonly<{
    available: Readonly<{
        toString: () => "available";
        valueOf: () => 0;
        toJSON: () => "available";
    }>;
    degraded: Readonly<{
        toString: () => "degraded";
        valueOf: () => 1;
        toJSON: () => "degraded";
    }>;
    unavailable: Readonly<{
        toString: () => "unavailable";
        valueOf: () => 2;
        toJSON: () => "unavailable";
    }>;
    critical: Readonly<{
        toString: () => "critical";
        valueOf: () => 3;
        toJSON: () => "critical";
    }>;
}>;
/**
 * A convenience type that represents the union of each value in {@link ServiceStatusLevels}.
 * @public
 */
export type ServiceStatusLevel = (typeof ServiceStatusLevels)[keyof typeof ServiceStatusLevels];
