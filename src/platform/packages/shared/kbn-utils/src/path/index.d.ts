import type { TypeOf } from '@kbn/config-schema';
/**
 * Get the path of kibana.yml
 * @internal
 */
export declare const getConfigPath: () => string;
/**
 * Get the directory containing configuration files
 * @internal
 */
export declare const getConfigDirectory: () => string;
/**
 * Get the directory containing runtime data
 * @internal
 */
export declare const getDataPath: () => string;
/**
 * Get the directory containing logs
 * @internal
 */
export declare const getLogsPath: () => string;
export type PathConfigType = TypeOf<typeof config.schema>;
export declare const config: {
    path: string;
    schema: import("@kbn/config-schema").ObjectType<{
        data: import("@kbn/config-schema").Type<string>;
    }>;
};
