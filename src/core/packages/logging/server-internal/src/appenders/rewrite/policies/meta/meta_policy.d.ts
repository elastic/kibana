import type { LogRecord } from '@kbn/logging';
import type { MetaRewritePolicyConfig } from '@kbn/core-logging-server';
import type { RewritePolicy } from '../policy';
export declare const metaRewritePolicyConfigSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"meta">;
    mode: import("@kbn/config-schema").Type<"remove" | "update">;
    properties: import("@kbn/config-schema").Type<Readonly<{
        value?: string | number | boolean | null | undefined;
    } & {
        path: string;
    }>[]>;
}>;
/**
 * A rewrite policy which can add, remove, or update properties
 * from a record's {@link LogMeta}.
 */
export declare class MetaRewritePolicy implements RewritePolicy {
    private readonly config;
    constructor(config: MetaRewritePolicyConfig);
    rewrite(record: LogRecord): LogRecord;
    private update;
    private remove;
}
