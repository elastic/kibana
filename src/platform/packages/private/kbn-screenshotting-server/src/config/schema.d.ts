import type { TypeOf } from '@kbn/config-schema';
import moment from 'moment';
export declare const ConfigSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
    networkPolicy: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        rules: import("@kbn/config-schema").Type<Readonly<{
            host?: string | undefined;
            protocol?: string | undefined;
        } & {
            allow: boolean;
        }>[]>;
    }>;
    browser: import("@kbn/config-schema").ObjectType<{
        autoDownload: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
        chromium: import("@kbn/config-schema").ObjectType<{
            disableSandbox: import("@kbn/config-schema").Type<boolean | undefined>;
            proxy: import("@kbn/config-schema").ObjectType<{
                enabled: import("@kbn/config-schema").Type<boolean>;
                server: import("@kbn/config-schema").ConditionalType<true, string, undefined>;
                bypass: import("@kbn/config-schema").ConditionalType<true, string[], undefined>;
            }>;
        }>;
    }>;
    capture: import("@kbn/config-schema").ObjectType<{
        timeouts: import("@kbn/config-schema").ObjectType<{
            openUrl: import("@kbn/config-schema").Type<number | moment.Duration>;
            waitForElements: import("@kbn/config-schema").Type<number | moment.Duration>;
            renderComplete: import("@kbn/config-schema").Type<number | moment.Duration>;
        }>;
        zoom: import("@kbn/config-schema").Type<number>;
        loadDelay: import("@kbn/config-schema").Type<number | moment.Duration | undefined>;
    }>;
    poolSize: import("@kbn/config-schema").Type<number>;
}>;
export type ConfigType = TypeOf<typeof ConfigSchema>;
