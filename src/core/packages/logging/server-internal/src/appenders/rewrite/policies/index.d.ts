import type { RewritePolicyConfig } from '@kbn/core-logging-server';
import type { RewritePolicy } from './policy';
export type { RewritePolicy };
export declare const rewritePolicyConfigSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"meta">;
    mode: import("@kbn/config-schema").Type<"remove" | "update">;
    properties: import("@kbn/config-schema").Type<Readonly<{
        value?: string | number | boolean | null | undefined;
    } & {
        path: string;
    }>[]>;
}>;
export declare const createRewritePolicy: (config: RewritePolicyConfig) => RewritePolicy;
