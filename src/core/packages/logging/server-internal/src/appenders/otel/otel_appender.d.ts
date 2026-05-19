import type { DisposableAppender, LogRecord } from '@kbn/logging';
import type { OtelAppenderConfig } from '@kbn/core-logging-server';
/**
 * A Kibana log appender that ships log records to an OTLP-compatible endpoint
 * using the OpenTelemetry Logs SDK.  Records are buffered by the SDK's
 * {@link BatchLogRecordProcessor} and flushed periodically or on shutdown.
 * @internal
 */
export declare class OtelAppender implements DisposableAppender {
    static configSchema: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"otel">;
        protocol: import("@kbn/config-schema").Type<"http" | "proto" | "grpc">;
        url: import("@kbn/config-schema").Type<string>;
        headers: import("@kbn/config-schema").Type<Record<string, string>>;
        /**
         * Optional layout config. Defaults to pattern layout (body.text, aliased to `message`).
         * Use `{ type: 'json' }` for a structured body (body.structured); note that the ECS
         * `message` field will be empty in that case because it aliases body.text.
         */
        layout: import("@kbn/config-schema").Type<Readonly<{} & {
            type: "json";
        }> | Readonly<{
            pattern?: string | undefined;
            highlight?: boolean | undefined;
        } & {
            type: "pattern";
        }> | undefined>;
        attributes: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
        ssl: import("@kbn/config-schema").Type<Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificateAuthorities?: string | string[] | undefined;
            keyPassphrase?: string | undefined;
        } & {
            verificationMode: "full" | "none" | "certificate";
        }> | undefined>;
    }>;
    private readonly loggerProvider;
    private readonly logger;
    private readonly layout;
    /** True when using JSON layout: the full LogRecord is sent as `body.structured`. */
    private readonly useStructuredBody;
    constructor(config: OtelAppenderConfig);
    append(record: LogRecord): void;
    dispose(): Promise<void>;
}
