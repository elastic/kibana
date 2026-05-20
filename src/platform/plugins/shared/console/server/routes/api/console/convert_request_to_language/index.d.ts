import type { TypeOf } from '@kbn/config-schema';
import type { RouteDependencies } from '../../..';
declare const routeValidationConfig: {
    query: import("@kbn/config-schema").ObjectType<{
        language: import("@kbn/config-schema").Type<string>;
        esHost: import("@kbn/config-schema").Type<string>;
        kibanaHost: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").Type<Readonly<{} & {
        data: string[];
        url: string;
        method: string;
    }>[] | undefined>;
};
export type Query = TypeOf<typeof routeValidationConfig.query>;
export type Body = TypeOf<typeof routeValidationConfig.body>;
export declare const registerConvertRequestRoute: ({ router, lib: { handleEsError }, }: RouteDependencies) => void;
export {};
