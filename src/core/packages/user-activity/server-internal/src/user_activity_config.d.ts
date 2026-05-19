import type { Type, TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
/** Filters applied to user activity events (defaults to none). */
declare const filtersSchema: Type<Readonly<{} & {
    policy: "keep" | "drop";
    actions: string[];
}>[]>;
/** @internal */
export type UserActivityFiltersType = TypeOf<typeof filtersSchema>;
/**
 * Configuration schema for the User Activity Service.
 * Uses the same appenders schema as the core logging service.
 */
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    enabled: Type<boolean>;
    appenders: Type<Map<string, Readonly<{} & {
        type: "console";
        layout: Readonly<{} & {
            type: "json";
        }> | Readonly<{
            pattern?: string | undefined;
            highlight?: boolean | undefined;
        } & {
            type: "pattern";
        }>;
    }> | Readonly<{} & {
        type: "file";
        layout: Readonly<{} & {
            type: "json";
        }> | Readonly<{
            pattern?: string | undefined;
            highlight?: boolean | undefined;
        } & {
            type: "pattern";
        }>;
        fileName: string;
    }> | Readonly<{
        ssl?: Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificateAuthorities?: string | string[] | undefined;
            keyPassphrase?: string | undefined;
        } & {
            verificationMode: "full" | "none" | "certificate";
        }> | undefined;
        layout?: Readonly<{} & {
            type: "json";
        }> | Readonly<{
            pattern?: string | undefined;
            highlight?: boolean | undefined;
        } & {
            type: "pattern";
        }> | undefined;
        attributes?: Record<string, string> | undefined;
    } & {
        url: string;
        type: "otel";
        headers: Record<string, string>;
        protocol: "http" | "proto" | "grpc";
    }> | Readonly<{} & {
        type: "rewrite";
        appenders: string[];
        policy: Readonly<{} & {
            type: "meta";
            properties: Readonly<{
                value?: string | number | boolean | null | undefined;
            } & {
                path: string;
            }>[];
            mode: "remove" | "update";
        }>;
    }> | Readonly<{
        retention?: Readonly<{
            maxFiles?: number | undefined;
            maxAccumulatedFileSize?: import("@kbn/config-schema").ByteSizeValue | undefined;
            removeOlderThan?: import("moment").Duration | undefined;
        } & {}> | undefined;
    } & {
        type: "rolling-file";
        layout: Readonly<{} & {
            type: "json";
        }> | Readonly<{
            pattern?: string | undefined;
            highlight?: boolean | undefined;
        } & {
            type: "pattern";
        }>;
        fileName: string;
        policy: Readonly<{} & {
            size: import("@kbn/config-schema").ByteSizeValue;
            type: "size-limit";
        }> | Readonly<{} & {
            type: "time-interval";
            interval: import("moment").Duration;
            modulate: boolean;
        }>;
        strategy: Readonly<{} & {
            type: "numeric";
            pattern: string;
            max: number;
        }>;
    }>>>;
    filters: Type<Readonly<{} & {
        policy: "keep" | "drop";
        actions: string[];
    }>[]>;
}>;
/** @internal */
export type UserActivityConfigType = TypeOf<typeof configSchema>;
/** @internal */
export declare const config: ServiceConfigDescriptor<UserActivityConfigType>;
export {};
