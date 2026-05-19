/**
 * Configuration of a rewrite appender
 * @public
 */
export interface RewriteAppenderConfig {
    type: 'rewrite';
    /**
     * The {@link Appender | appender(s)} to pass the log event to after
     * implementing the specified rewrite policy.
     */
    appenders: string[];
    /**
     * The {@link RewritePolicy | policy} to use to manipulate the provided data.
     */
    policy: RewritePolicyConfig;
}
/**
 * Available rewrite policies which specify what part of a {@link LogRecord}
 * can be modified.
 */
export type RewritePolicyConfig = MetaRewritePolicyConfig;
export interface MetaRewritePolicyConfigProperty {
    path: string;
    value?: string | number | boolean | null;
}
export interface MetaRewritePolicyConfig {
    type: 'meta';
    /**
     * The 'mode' specifies what action to perform on the specified properties.
     *   - 'update' updates an existing property at the provided 'path'.
     *   - 'remove' removes an existing property at the provided 'path'.
     */
    mode: 'remove' | 'update';
    /**
     * The properties to modify.
     *
     * @remarks
     * Each provided 'path' is relative to the record's {@link LogMeta}.
     * For the 'remove' mode, no 'value' is provided.
     */
    properties: MetaRewritePolicyConfigProperty[];
}
