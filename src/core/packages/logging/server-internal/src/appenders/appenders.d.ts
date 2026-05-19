import type { DisposableAppender } from '@kbn/logging';
import type { AppenderConfigType } from '@kbn/core-logging-server';
/**
 * Config schema for validting the shape of the `appenders` key in in {@link LoggerContextConfigType} or
 * {@link LoggingConfigType}.
 *
 * @public
 */
export declare const appendersSchema: import("@kbn/config-schema").Type<Readonly<{} & {
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
}>>;
/** @internal */
export declare class Appenders {
    static configSchema: import("@kbn/config-schema").Type<Readonly<{} & {
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
    }>>;
    /**
     * Factory method that creates specific `Appender` instances based on the passed `config` parameter.
     * @param config Configuration specific to a particular `Appender` implementation.
     * @returns Fully constructed `Appender` instance.
     */
    static create(config: AppenderConfigType): DisposableAppender;
}
