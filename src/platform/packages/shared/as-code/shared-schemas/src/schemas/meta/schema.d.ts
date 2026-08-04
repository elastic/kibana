import type { TypeOf } from '@kbn/config-schema';
export declare const asCodeMetaSchema: import("@kbn/config-schema").ObjectType<{
    created_at: import("@kbn/config-schema").Type<string | undefined>;
    created_by: import("@kbn/config-schema").Type<string | undefined>;
    managed: import("@kbn/config-schema").Type<boolean | undefined>;
    owner: import("@kbn/config-schema").Type<string | undefined>;
    updated_at: import("@kbn/config-schema").Type<string | undefined>;
    updated_by: import("@kbn/config-schema").Type<string | undefined>;
    version: import("@kbn/config-schema").Type<string | undefined>;
}>;
export type AsCodeMeta = TypeOf<typeof asCodeMetaSchema>;
