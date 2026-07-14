import type { Type, TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
/** Filters applied to user activity events (defaults to none). */
declare const filtersSchema: Type<Readonly<{} & {
    policy: "drop" | "keep";
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
        attributes?: Record<string, string> | undefined;
        layout?: Readonly<{} & {
            type: "json";
        }> | Readonly<{
            pattern?: string | undefined;
            highlight?: boolean | undefined;
        } & {
            type: "pattern";
        }> | undefined;
        ssl?: Readonly<{
            key?: string | undefined;
            certificate?: string | undefined;
            certificateAuthorities?: string | string[] | undefined;
            keyPassphrase?: string | undefined;
        } & {
            verificationMode: "full" | "none" | "certificate";
            allowPartialTrustChain: boolean;
        }> | undefined;
    } & {
        type: "otel";
        protocol: "http" | "proto" | "grpc";
        headers: Record<string, string>;
        url: string;
    }> | Readonly<{} & {
        type: "rewrite";
        policy: Readonly<{} & {
            type: "meta";
            properties: Readonly<{
                value?: string | number | boolean | null | undefined;
            } & {
                path: string;
            }>[];
            mode: "remove" | "update";
        }>;
        appenders: string[];
    }> | Readonly<{
        retention?: Readonly<{
            maxFiles?: number | undefined;
            maxAccumulatedFileSize?: import("@kbn/config-schema").ByteSizeValue | undefined;
            removeOlderThan?: import("moment").Duration | undefined;
        } & {}> | undefined;
    } & {
        type: "rolling-file";
        policy: Readonly<{} & {
            type: "size-limit";
            size: import("@kbn/config-schema").ByteSizeValue;
        }> | Readonly<{} & {
            type: "time-interval";
            interval: import("moment").Duration;
            modulate: boolean;
        }>;
        layout: Readonly<{} & {
            type: "json";
        }> | Readonly<{
            pattern?: string | undefined;
            highlight?: boolean | undefined;
        } & {
            type: "pattern";
        }>;
        fileName: string;
        strategy: Readonly<{} & {
            type: "numeric";
            pattern: string;
            max: number;
        }>;
    }>>>;
    filters: Type<Readonly<{} & {
        policy: "drop" | "keep";
        actions: string[];
    }>[]>;
}>;
/** @internal */
export type UserActivityConfigType = TypeOf<typeof configSchema>;
/** @internal */
export declare const config: ServiceConfigDescriptor<UserActivityConfigType>;
export {};
