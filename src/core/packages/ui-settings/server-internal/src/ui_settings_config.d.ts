import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
export declare const defaultThemeSchema: import("@kbn/config-schema").Type<string>;
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    overrides: import("@kbn/config-schema").ObjectType<{}>;
    globalOverrides: import("@kbn/config-schema").ObjectType<{}>;
    publicApiEnabled: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
    experimental: import("@kbn/config-schema").Type<Readonly<{
        themeSwitcherEnabled?: boolean | undefined;
        defaultTheme?: string | undefined;
    } & {}> | undefined>;
}>;
export type UiSettingsConfigType = TypeOf<typeof configSchema>;
export declare const uiSettingsConfig: ServiceConfigDescriptor<UiSettingsConfigType>;
export {};
