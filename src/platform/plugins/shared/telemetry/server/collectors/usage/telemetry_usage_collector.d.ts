import type { Observable } from 'rxjs';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { TelemetryConfigType } from '../../config';
/**
 * The maximum file size before we ignore it (note: this limit is arbitrary).
 */
export declare const MAX_FILE_SIZE: number;
/**
 * Determine if the supplied `path` is readable.
 *
 * @param path The possible path where a config file may exist.
 * @returns `true` if the file should be used.
 */
export declare function isFileReadable(path: string): boolean;
/**
 * Load the `telemetry.yml` file, if it exists, and return its contents as
 * a JSON object.
 *
 * @param configPath The config file path.
 * @returns The unmodified JSON object if the file exists and is a valid YAML file.
 */
export declare function readTelemetryFile<T extends object>(configPath: string): Promise<T | undefined>;
export interface LicenseUsage {
    uuid: string;
    type: string;
    issued_to: string;
    issuer: string;
    issue_date_in_millis: number;
    start_date_in_millis: number;
    expiry_date_in_millis: number;
    max_resource_units: number;
}
export interface StaticTelemetryUsage {
    ece?: {
        kb_uuid: string;
        es_uuid: string;
        account_id: string;
        license: LicenseUsage;
    };
    ess?: {
        kb_uuid: string;
        es_uuid: string;
        account_id: string;
        license: LicenseUsage;
    };
    eck?: {
        operator_uuid: string;
        operator_roles: string;
        custom_operator_namespace: boolean;
        distribution: string;
        build: {
            hash: string;
            date: string;
            version: string;
        };
    };
    'start-local'?: {
        version: string;
    };
}
export declare function createTelemetryUsageCollector(usageCollection: UsageCollectionSetup, getConfigPathFn: () => Promise<string>): import("@kbn/usage-collection-plugin/server").Collector<StaticTelemetryUsage | undefined, {}>;
export declare function registerTelemetryUsageCollector(usageCollection: UsageCollectionSetup, config$: Observable<TelemetryConfigType>): void;
