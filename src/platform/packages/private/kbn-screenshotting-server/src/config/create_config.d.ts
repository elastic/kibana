import type { Logger } from '@kbn/core/server';
import type { ConfigType } from './schema';
export declare function createConfig(parentLogger: Logger, config: ConfigType): Promise<Readonly<{} & {
    browser: Readonly<{} & {
        autoDownload: boolean;
        chromium: Readonly<{
            disableSandbox?: boolean | undefined;
        } & {
            proxy: Readonly<{
                server?: string | undefined;
                bypass?: string[] | undefined;
            } & {
                enabled: boolean;
            }>;
        }>;
    }>;
    enabled: boolean;
    capture: Readonly<{
        loadDelay?: number | import("moment").Duration | undefined;
    } & {
        zoom: number;
        timeouts: Readonly<{} & {
            renderComplete: number | import("moment").Duration;
            openUrl: number | import("moment").Duration;
            waitForElements: number | import("moment").Duration;
        }>;
    }>;
    networkPolicy: Readonly<{} & {
        enabled: boolean;
        rules: Readonly<{
            host?: string | undefined;
            protocol?: string | undefined;
        } & {
            allow: boolean;
        }>[];
    }>;
    poolSize: number;
}>>;
