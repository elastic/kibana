import type { TypeOf } from '@kbn/config-schema';
export declare const pidConfig: {
    path: string;
    schema: import("@kbn/config-schema").ObjectType<{
        file: import("@kbn/config-schema").Type<string | undefined>;
        exclusive: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export type PidConfigType = TypeOf<typeof pidConfig.schema>;
