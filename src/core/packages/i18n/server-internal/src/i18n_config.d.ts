import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    locales: import("@kbn/config-schema").Type<string[]>;
    defaultLocale: import("@kbn/config-schema").Type<string>;
}>;
export type I18nConfigType = TypeOf<typeof configSchema>;
export declare const config: ServiceConfigDescriptor<I18nConfigType>;
export {};
