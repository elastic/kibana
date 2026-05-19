export declare const versionSchema: import("@kbn/config-schema").ObjectType<Omit<{
    runs: import("@kbn/config-schema").Type<number>;
    telemetry: import("@kbn/config-schema").ObjectType<{
        panels: import("@kbn/config-schema").ObjectType<{
            total: import("@kbn/config-schema").Type<number>;
            by_reference: import("@kbn/config-schema").Type<number>;
            by_value: import("@kbn/config-schema").Type<number>;
            by_type: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
                total: number;
                details: Record<string, number>;
                by_reference: number;
                by_value: number;
            }>>>;
        }>;
        controls: import("@kbn/config-schema").ObjectType<{
            total: import("@kbn/config-schema").Type<number>;
            chaining_system: import("@kbn/config-schema").Type<Record<string, number>>;
            label_position: import("@kbn/config-schema").Type<Record<string, number>>;
            ignore_settings: import("@kbn/config-schema").Type<Record<string, number>>;
            by_type: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
                total: number;
            }>>>;
        }>;
        sections: import("@kbn/config-schema").ObjectType<{
            total: import("@kbn/config-schema").Type<number>;
        }>;
    }>;
}, "telemetry"> & {
    telemetry: import("@kbn/config-schema").ObjectType<Omit<{
        panels: import("@kbn/config-schema").ObjectType<{
            total: import("@kbn/config-schema").Type<number>;
            by_reference: import("@kbn/config-schema").Type<number>;
            by_value: import("@kbn/config-schema").Type<number>;
            by_type: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
                total: number;
                details: Record<string, number>;
                by_reference: number;
                by_value: number;
            }>>>;
        }>;
        controls: import("@kbn/config-schema").ObjectType<{
            total: import("@kbn/config-schema").Type<number>;
            chaining_system: import("@kbn/config-schema").Type<Record<string, number>>;
            label_position: import("@kbn/config-schema").Type<Record<string, number>>;
            ignore_settings: import("@kbn/config-schema").Type<Record<string, number>>;
            by_type: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
                total: number;
            }>>>;
        }>;
        sections: import("@kbn/config-schema").ObjectType<{
            total: import("@kbn/config-schema").Type<number>;
        }>;
    }, "access_mode"> & {
        access_mode: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
            total: number;
        }>>>;
    }>;
}>;
