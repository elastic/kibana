import type { DisposableAppender } from '@kbn/logging';
import type { PluginAppenderConfigType } from '@kbn/core-logging-server';
/**
 * Config schema for validting the shape of the `appenders` key in in {@link LoggerContextConfigType} or
 * {@link LoggingConfigType}.
 *
 * @public
 */
export declare const appendersSchema: import("@kbn/config-schema").Type<Readonly<{
    layout?: Readonly<{} & {
        type: "json";
    }> | Readonly<{
        highlight?: boolean | undefined;
        pattern?: string | undefined;
    } & {
        type: "pattern";
    }> | undefined;
    attributes?: Record<string, string> | undefined;
    includeResources?: string[] | undefined;
    promoteResourceAttributes?: string[] | undefined;
    ssl?: Readonly<{
        certificateAuthorities?: string | string[] | undefined;
        certificate?: string | undefined;
        key?: string | undefined;
        keyPassphrase?: string | undefined;
    } & {
        verificationMode: "certificate" | "full" | "none";
        allowPartialTrustChain: boolean;
    }> | undefined;
} & {
    type: "otel";
    protocol: "grpc" | "http" | "proto";
    url: string;
    headers: Record<string, string>;
    maxQueueSize: number;
    maxElapsedTime: import("moment").Duration;
}> | Readonly<{} & {
    type: "console";
    layout: Readonly<{} & {
        type: "json";
    }> | Readonly<{
        highlight?: boolean | undefined;
        pattern?: string | undefined;
    } & {
        type: "pattern";
    }>;
}> | Readonly<{} & {
    type: "file";
    layout: Readonly<{} & {
        type: "json";
    }> | Readonly<{
        highlight?: boolean | undefined;
        pattern?: string | undefined;
    } & {
        type: "pattern";
    }>;
    fileName: string;
}> | Readonly<{} & {
    type: "rewrite";
    appenders: string[];
    policy: Readonly<{} & {
        type: "meta";
        mode: "remove" | "update";
        properties: Readonly<{
            value?: string | number | boolean | null | undefined;
        } & {
            path: string;
        }>[];
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
        highlight?: boolean | undefined;
        pattern?: string | undefined;
    } & {
        type: "pattern";
    }>;
    fileName: string;
    policy: Readonly<{} & {
        type: "size-limit";
        size: import("@kbn/config-schema").ByteSizeValue;
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
/** @internal {@link appendersSchema}, but the file and OTel appenders use their runtime schemas. */
export declare const pluginAppendersSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: "console";
    layout: Readonly<{} & {
        type: "json";
    }> | Readonly<{
        highlight?: boolean | undefined;
        pattern?: string | undefined;
    } & {
        type: "pattern";
    }>;
}> | Readonly<{} & {
    type: "rewrite";
    appenders: string[];
    policy: Readonly<{} & {
        type: "meta";
        mode: "remove" | "update";
        properties: Readonly<{
            value?: string | number | boolean | null | undefined;
        } & {
            path: string;
        }>[];
    }>;
}> | Readonly<{
    onWriteError?: any;
} & {
    type: "file";
    layout: Readonly<{} & {
        type: "json";
    }> | Readonly<{
        highlight?: boolean | undefined;
        pattern?: string | undefined;
    } & {
        type: "pattern";
    }>;
    fileName: string;
}> | Readonly<{
    layout?: Readonly<{} & {
        type: "json";
    }> | Readonly<{
        highlight?: boolean | undefined;
        pattern?: string | undefined;
    } & {
        type: "pattern";
    }> | undefined;
    attributes?: Record<string, string> | undefined;
    includeResources?: string[] | undefined;
    promoteResourceAttributes?: string[] | undefined;
    ssl?: Readonly<{
        certificateAuthorities?: string | string[] | undefined;
        certificate?: string | undefined;
        key?: string | undefined;
        keyPassphrase?: string | undefined;
    } & {
        verificationMode: "certificate" | "full" | "none";
        allowPartialTrustChain: boolean;
    }> | undefined;
    transformAttributes?: any;
    dropResourceAttributes?: string[] | undefined;
    maxQueueSize?: number | undefined;
    maxElapsedTime?: import("moment").Duration | undefined;
} & {
    type: "otel";
    protocol: "grpc" | "http" | "proto";
    url: string;
    headers: Record<string, string>;
}> | Readonly<{
    retention?: Readonly<{
        maxFiles?: number | undefined;
        maxAccumulatedFileSize?: import("@kbn/config-schema").ByteSizeValue | undefined;
        removeOlderThan?: import("moment").Duration | undefined;
    } & {}> | undefined;
    onWriteError?: any;
} & {
    type: "rolling-file";
    layout: Readonly<{} & {
        type: "json";
    }> | Readonly<{
        highlight?: boolean | undefined;
        pattern?: string | undefined;
    } & {
        type: "pattern";
    }>;
    fileName: string;
    policy: Readonly<{} & {
        type: "size-limit";
        size: import("@kbn/config-schema").ByteSizeValue;
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
    static configSchema: import("@kbn/config-schema").Type<Readonly<{
        layout?: Readonly<{} & {
            type: "json";
        }> | Readonly<{
            highlight?: boolean | undefined;
            pattern?: string | undefined;
        } & {
            type: "pattern";
        }> | undefined;
        attributes?: Record<string, string> | undefined;
        includeResources?: string[] | undefined;
        promoteResourceAttributes?: string[] | undefined;
        ssl?: Readonly<{
            certificateAuthorities?: string | string[] | undefined;
            certificate?: string | undefined;
            key?: string | undefined;
            keyPassphrase?: string | undefined;
        } & {
            verificationMode: "certificate" | "full" | "none";
            allowPartialTrustChain: boolean;
        }> | undefined;
    } & {
        type: "otel";
        protocol: "grpc" | "http" | "proto";
        url: string;
        headers: Record<string, string>;
        maxQueueSize: number;
        maxElapsedTime: import("moment").Duration;
    }> | Readonly<{} & {
        type: "console";
        layout: Readonly<{} & {
            type: "json";
        }> | Readonly<{
            highlight?: boolean | undefined;
            pattern?: string | undefined;
        } & {
            type: "pattern";
        }>;
    }> | Readonly<{} & {
        type: "file";
        layout: Readonly<{} & {
            type: "json";
        }> | Readonly<{
            highlight?: boolean | undefined;
            pattern?: string | undefined;
        } & {
            type: "pattern";
        }>;
        fileName: string;
    }> | Readonly<{} & {
        type: "rewrite";
        appenders: string[];
        policy: Readonly<{} & {
            type: "meta";
            mode: "remove" | "update";
            properties: Readonly<{
                value?: string | number | boolean | null | undefined;
            } & {
                path: string;
            }>[];
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
            highlight?: boolean | undefined;
            pattern?: string | undefined;
        } & {
            type: "pattern";
        }>;
        fileName: string;
        policy: Readonly<{} & {
            type: "size-limit";
            size: import("@kbn/config-schema").ByteSizeValue;
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
    static create(config: PluginAppenderConfigType): DisposableAppender;
}
