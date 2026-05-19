import { ByteSizeValue } from '@kbn/config-schema';
import moment from 'moment';
export declare const ConfigSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    kibanaServer: import("@kbn/config-schema").ObjectType<{
        hostname: import("@kbn/config-schema").Type<string | undefined>;
        port: import("@kbn/config-schema").Type<number | undefined>;
        protocol: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    queue: import("@kbn/config-schema").ObjectType<{
        indexInterval: import("@kbn/config-schema").Type<string>;
        pollEnabled: import("@kbn/config-schema").Type<boolean>;
        pollInterval: import("@kbn/config-schema").Type<number | moment.Duration>;
        pollIntervalErrorMultiplier: import("@kbn/config-schema").Type<number>;
        timeout: import("@kbn/config-schema").Type<number | moment.Duration>;
    }>;
    capture: import("@kbn/config-schema").ObjectType<{
        maxAttempts: import("@kbn/config-schema").ConditionalType<true, number, number>;
    }>;
    csv: import("@kbn/config-schema").ObjectType<{
        checkForFormulas: import("@kbn/config-schema").Type<boolean>;
        escapeFormulaValues: import("@kbn/config-schema").Type<boolean>;
        enablePanelActionDownload: import("@kbn/config-schema").Type<boolean | undefined>;
        maxSizeBytes: import("@kbn/config-schema").Type<number | ByteSizeValue>;
        useByteOrderMarkEncoding: import("@kbn/config-schema").Type<boolean>;
        scroll: import("@kbn/config-schema").ObjectType<{
            strategy: import("@kbn/config-schema").Type<"scroll" | "pit">;
            duration: import("@kbn/config-schema").Type<string>;
            size: import("@kbn/config-schema").Type<number>;
        }>;
        maxConcurrentShardRequests: import("@kbn/config-schema").Type<number>;
        maxRows: import("@kbn/config-schema").Type<number>;
    }>;
    encryptionKey: import("@kbn/config-schema").ConditionalType<true, string | undefined, string>;
    roles: import("@kbn/config-schema").Type<Readonly<{} & {
        enabled: boolean;
        allow: string[];
    }> | undefined>;
    poll: import("@kbn/config-schema").ObjectType<{
        jobCompletionNotifier: import("@kbn/config-schema").ObjectType<{
            interval: import("@kbn/config-schema").Type<number>;
            intervalErrorMultiplier: import("@kbn/config-schema").Type<number>;
        }>;
        jobsRefresh: import("@kbn/config-schema").ObjectType<{
            interval: import("@kbn/config-schema").Type<number>;
            intervalErrorMultiplier: import("@kbn/config-schema").Type<number>;
        }>;
    }>;
    export_types: import("@kbn/config-schema").ObjectType<{
        csv: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").Type<boolean>;
        }>;
        png: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
        }>;
        pdf: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
        }>;
    }>;
    statefulSettings: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
    }>;
}>;
