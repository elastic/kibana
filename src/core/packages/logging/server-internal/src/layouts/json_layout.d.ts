import type { LogRecord, Layout } from '@kbn/logging';
/**
 * Layout that just converts `LogRecord` into JSON string.
 * @internal
 */
export declare class JsonLayout implements Layout {
    static configSchema: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"json">;
    }>;
    format(record: LogRecord): string;
}
