import type { LogRecord, Appender, DisposableAppender } from '@kbn/logging';
import type { RewriteAppenderConfig } from '@kbn/core-logging-server';
/**
 * Appender that can modify the `LogRecord` instances it receives before passing
 * them along to another {@link Appender}.
 * @internal
 */
export declare class RewriteAppender implements DisposableAppender {
    private readonly config;
    static configSchema: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"rewrite">;
        appenders: import("@kbn/config-schema").Type<string[]>;
        policy: import("@kbn/config-schema").ObjectType<{
            type: import("@kbn/config-schema").Type<"meta">;
            mode: import("@kbn/config-schema").Type<"remove" | "update">;
            properties: import("@kbn/config-schema").Type<Readonly<{
                value?: string | number | boolean | null | undefined;
            } & {
                path: string;
            }>[]>;
        }>;
    }>;
    private appenders;
    private readonly policy;
    constructor(config: RewriteAppenderConfig);
    /**
     * List of appenders that are dependencies of this appender.
     *
     * `addAppender` will throw an error when called with an appender
     * reference that isn't in this list.
     */
    get appenderRefs(): string[];
    /**
     * Appenders can be "attached" to this one so that the RewriteAppender
     * is able to act as a sort of middleware by calling `append` on other appenders.
     *
     * As appenders cannot be attached to each other until they are created,
     * the `addAppender` method is used to pass in a configured appender.
     */
    addAppender(appenderRef: string, appender: Appender): void;
    /**
     * Modifies the `record` and passes it to the specified appender.
     */
    append(record: LogRecord): void;
    /**
     * Disposes `RewriteAppender`.
     */
    dispose(): void;
}
