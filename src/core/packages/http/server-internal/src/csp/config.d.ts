import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    disableUnsafeEval: import("@kbn/config-schema").Type<boolean>;
    script_src: import("@kbn/config-schema").Type<string[]>;
    worker_src: import("@kbn/config-schema").Type<string[]>;
    style_src: import("@kbn/config-schema").Type<string[]>;
    connect_src: import("@kbn/config-schema").Type<string[]>;
    default_src: import("@kbn/config-schema").Type<string[]>;
    font_src: import("@kbn/config-schema").Type<string[]>;
    frame_src: import("@kbn/config-schema").Type<string[]>;
    img_src: import("@kbn/config-schema").Type<string[]>;
    object_src: import("@kbn/config-schema").Type<string[]>;
    form_action: import("@kbn/config-schema").Type<string[]>;
    frame_ancestors: import("@kbn/config-schema").Type<string[]>;
    report_uri: import("@kbn/config-schema").Type<string[]>;
    report_to: import("@kbn/config-schema").Type<string[]>;
    report_only: import("@kbn/config-schema").Type<Readonly<{} & {
        connect_src: string[];
        object_src: string[];
        form_action: string[];
    }> | undefined>;
    strict: import("@kbn/config-schema").Type<boolean>;
    warnLegacyBrowsers: import("@kbn/config-schema").Type<boolean>;
    disableEmbedding: import("@kbn/config-schema").Type<boolean>;
}>;
/**
 * @internal
 */
export type CspConfigType = TypeOf<typeof configSchema>;
/**
 * @internal
 */
export type CspAdditionalConfig = Pick<Partial<CspConfigType>, 'connect_src' | 'default_src' | 'font_src' | 'frame_src' | 'img_src' | 'script_src' | 'style_src' | 'worker_src'>;
export declare const cspConfig: ServiceConfigDescriptor<CspConfigType>;
export {};
