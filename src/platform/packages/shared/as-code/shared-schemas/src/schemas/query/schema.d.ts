import type { TypeOf } from '@kbn/config-schema';
export declare const asCodeQuerySchema: import("@kbn/config-schema").ObjectType<{
    expression: import("@kbn/config-schema").Type<string>;
    language: import("@kbn/config-schema").Type<"kql" | "lucene">;
}>;
export type AsCodeQuery = TypeOf<typeof asCodeQuerySchema>;
