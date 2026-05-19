import { type TypeOf } from '@kbn/config-schema';
export declare const rateLimiterConfigSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    elu: import("@kbn/config-schema").ConditionalType<false, never, number>;
    term: import("@kbn/config-schema").ConditionalType<false, never, "short" | "medium" | "long">;
}>;
export type RateLimiterConfig = TypeOf<typeof rateLimiterConfigSchema>;
