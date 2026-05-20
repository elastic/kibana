import type { TypeOf } from '@kbn/config-schema';
export type Query = TypeOf<typeof routeValidationConfig.query>;
export type Body = TypeOf<typeof routeValidationConfig.body>;
export declare const acceptedHttpVerb: import("@kbn/config-schema").Type<string>;
export declare const nonEmptyString: import("@kbn/config-schema").Type<string>;
export declare const routeValidationConfig: {
    query: import("@kbn/config-schema").ObjectType<{
        method: import("@kbn/config-schema").Type<string>;
        path: import("@kbn/config-schema").Type<string>;
        withProductOrigin: import("@kbn/config-schema").Type<boolean | undefined>;
        host: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    body: import("@kbn/config-schema").Type<import("stream")>;
};
