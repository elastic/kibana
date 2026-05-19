export declare const versionDefinition: {
    up: (state: Record<string, any>) => Readonly<{} & {
        telemetry: Readonly<{} & {
            controls: Readonly<{} & {
                total: number;
                by_type: Record<string, Readonly<{} & {
                    total: number;
                }>>;
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
            access_mode: Record<string, Readonly<{} & {
                total: number;
            }>>;
        }>;
        runs: number;
    }>;
    schema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
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
    }, "telemetry"> & {
        telemetry: import("@kbn/config-schema").ObjectType<Omit<Omit<{
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
        }, "controls"> & {
            controls: import("@kbn/config-schema").ObjectType<Omit<{
                total: import("@kbn/config-schema").Type<number>;
                chaining_system: import("@kbn/config-schema").Type<Record<string, number>>;
                label_position: import("@kbn/config-schema").Type<Record<string, number>>;
                ignore_settings: import("@kbn/config-schema").Type<Record<string, number>>;
                by_type: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
                    total: number;
                }>>>;
            }, "chaining_system" | "label_position" | "ignore_settings"> & {}>;
        }>;
    }>;
};
