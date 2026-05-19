export declare const versionDefinition: {
    up: (state: Record<string, any>) => Readonly<{} & {
        telemetry: Readonly<{} & {
            controls: Readonly<{} & {
                total: number;
                by_type: Record<string, Readonly<{} & {
                    total: number;
                }>>;
                chaining_system: Record<string, number>;
                label_position: Record<string, number>;
                ignore_settings: Record<string, number>;
            }>;
            sections: Readonly<{} & {
                total: number;
            }>;
            panels: Readonly<{} & {
                total: number;
                by_type: Record<string, Readonly<{} & {
                    total: number;
                    details: Record<string, number>;
                    by_reference: number;
                    by_value: number;
                }>>;
                by_reference: number;
                by_value: number;
            }>;
        }>;
        runs: number;
    }>;
    schema: import("@kbn/config-schema").ObjectType<{
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
    }>;
};
