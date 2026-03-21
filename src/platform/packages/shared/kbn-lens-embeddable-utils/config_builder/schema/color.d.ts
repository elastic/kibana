import type { TypeOf } from '@kbn/config-schema';
declare const colorByValueStepSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * The lower bound of range from which this color applies (inclusive).
     */
    gte: import("@kbn/config-schema").Type<number | null | undefined>;
    /**
     * The upper bound of range to which this color applies (exclusive).
     */
    lt: import("@kbn/config-schema").Type<number | null | undefined>;
    /**
     * The upper bound of range to which this color applies (inclusive).
     */
    lte: import("@kbn/config-schema").Type<number | null | undefined>;
    /**
     * The color to use for this step.
     */
    color: import("@kbn/config-schema").Type<string>;
}>;
export declare const colorByValueStepsSchema: import("@kbn/config-schema").Type<Readonly<{
    lt?: number | null | undefined;
    gte?: number | null | undefined;
    lte?: number | null | undefined;
} & {
    color: string;
}>[]>;
export declare const legacyColorByValueSchema: import("@kbn/config-schema").ObjectType<Omit<{
    type: import("@kbn/config-schema").Type<"dynamic">;
    /**
     * Determines whether the range is interpreted as absolute or as a percentage of the data.
     */
    range: import("@kbn/config-schema").Type<"absolute" | "percentage">;
    /**
     * Array of color steps defining the mapping from values to colors.
     */
    steps: import("@kbn/config-schema").Type<Readonly<{
        lt?: number | null | undefined;
        gte?: number | null | undefined;
        lte?: number | null | undefined;
    } & {
        color: string;
    }>[]>;
}, "shift" | "type" | "palette"> & {
    shift: import("@kbn/config-schema").Type<boolean>;
    type: import("@kbn/config-schema").Type<"legacy_dynamic">;
    palette: import("@kbn/config-schema").Type<string>;
}>;
export declare const legacyColorByValueAbsoluteSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    type: import("@kbn/config-schema").Type<"dynamic">;
    /**
     * Determines whether the range is interpreted as absolute or as a percentage of the data.
     */
    range: import("@kbn/config-schema").Type<"absolute" | "percentage">;
    /**
     * Array of color steps defining the mapping from values to colors.
     */
    steps: import("@kbn/config-schema").Type<Readonly<{
        lt?: number | null | undefined;
        gte?: number | null | undefined;
        lte?: number | null | undefined;
    } & {
        color: string;
    }>[]>;
}, "shift" | "type" | "palette"> & {
    shift: import("@kbn/config-schema").Type<boolean>;
    type: import("@kbn/config-schema").Type<"legacy_dynamic">;
    palette: import("@kbn/config-schema").Type<string>;
}, "range"> & {
    range: import("@kbn/config-schema").Type<"absolute">;
}>;
export declare const colorByValueAbsoluteSchema: import("@kbn/config-schema").ObjectType<Omit<{
    type: import("@kbn/config-schema").Type<"dynamic">;
    /**
     * Determines whether the range is interpreted as absolute or as a percentage of the data.
     */
    range: import("@kbn/config-schema").Type<"absolute" | "percentage">;
    /**
     * Array of color steps defining the mapping from values to colors.
     */
    steps: import("@kbn/config-schema").Type<Readonly<{
        lt?: number | null | undefined;
        gte?: number | null | undefined;
        lte?: number | null | undefined;
    } & {
        color: string;
    }>[]>;
}, "range"> & {
    range: import("@kbn/config-schema").Type<"absolute">;
}>;
export declare const colorByValuePercentageSchema: import("@kbn/config-schema").ObjectType<Omit<{
    type: import("@kbn/config-schema").Type<"dynamic">;
    /**
     * Determines whether the range is interpreted as absolute or as a percentage of the data.
     */
    range: import("@kbn/config-schema").Type<"absolute" | "percentage">;
    /**
     * Array of color steps defining the mapping from values to colors.
     */
    steps: import("@kbn/config-schema").Type<Readonly<{
        lt?: number | null | undefined;
        gte?: number | null | undefined;
        lte?: number | null | undefined;
    } & {
        color: string;
    }>[]>;
}, "range"> & {
    range: import("@kbn/config-schema").Type<"percentage">;
}>;
export declare const colorByValueSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    shift: boolean;
    type: "legacy_dynamic";
    palette: string;
    range: "absolute" | "percentage";
    steps: Readonly<{
        lt?: number | null | undefined;
        gte?: number | null | undefined;
        lte?: number | null | undefined;
    } & {
        color: string;
    }>[];
}> | Readonly<{} & {
    type: "dynamic";
    range: "absolute";
    steps: Readonly<{
        lt?: number | null | undefined;
        gte?: number | null | undefined;
        lte?: number | null | undefined;
    } & {
        color: string;
    }>[];
}> | Readonly<{} & {
    type: "dynamic";
    range: "percentage";
    steps: Readonly<{
        lt?: number | null | undefined;
        gte?: number | null | undefined;
        lte?: number | null | undefined;
    } & {
        color: string;
    }>[];
}>>;
export declare const staticColorSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"static">;
    /**
     * The static color to be used for all values.
     */
    color: import("@kbn/config-schema").Type<string>;
}>;
declare const colorDefSchema: import("@kbn/config-schema").Type<Readonly<{
    palette?: string | undefined;
} & {
    type: "from_palette";
    index: number;
}> | Readonly<{} & {
    type: "color_code";
    value: string;
}>>;
declare const categoricalColorMappingSchema: import("@kbn/config-schema").ObjectType<{
    mode: import("@kbn/config-schema").Type<"categorical">;
    palette: import("@kbn/config-schema").Type<string>;
    mapping: import("@kbn/config-schema").Type<Readonly<{} & {
        values: (string | number | Readonly<{} & {
            type: "range_key";
            from: string | number;
            to: string | number;
            ranges: Readonly<{} & {
                label: string;
                from: string | number;
                to: string | number;
            }>[];
        }> | Readonly<{} & {
            keys: string[];
            type: "multi_field_key";
        }>)[];
        color: Readonly<{
            palette?: string | undefined;
        } & {
            type: "from_palette";
            index: number;
        }> | Readonly<{} & {
            type: "color_code";
            value: string;
        }>;
    }>[]>;
    unassignedColor: import("@kbn/config-schema").Type<Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        type: "color_code";
        value: string;
    }> | undefined>;
}>;
declare const gradientColorMappingSchema: import("@kbn/config-schema").ObjectType<{
    mode: import("@kbn/config-schema").Type<"gradient">;
    palette: import("@kbn/config-schema").Type<string>;
    sort: import("@kbn/config-schema").Type<"desc" | "asc" | undefined>;
    mapping: import("@kbn/config-schema").Type<Readonly<{} & {
        values: (string | number | Readonly<{} & {
            type: "range_key";
            from: string | number;
            to: string | number;
            ranges: Readonly<{} & {
                label: string;
                from: string | number;
                to: string | number;
            }>[];
        }> | Readonly<{} & {
            keys: string[];
            type: "multi_field_key";
        }>)[];
    }>[] | undefined>;
    gradient: import("@kbn/config-schema").Type<(Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        type: "color_code";
        value: string;
    }>)[] | undefined>;
    unassignedColor: import("@kbn/config-schema").Type<Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        type: "color_code";
        value: string;
    }> | undefined>;
}>;
export declare const colorMappingSchema: import("@kbn/config-schema").Type<Readonly<{
    unassignedColor?: Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        type: "color_code";
        value: string;
    }> | undefined;
} & {
    mapping: Readonly<{} & {
        values: (string | number | Readonly<{} & {
            type: "range_key";
            from: string | number;
            to: string | number;
            ranges: Readonly<{} & {
                label: string;
                from: string | number;
                to: string | number;
            }>[];
        }> | Readonly<{} & {
            keys: string[];
            type: "multi_field_key";
        }>)[];
        color: Readonly<{
            palette?: string | undefined;
        } & {
            type: "from_palette";
            index: number;
        }> | Readonly<{} & {
            type: "color_code";
            value: string;
        }>;
    }>[];
    palette: string;
    mode: "categorical";
}> | Readonly<{
    sort?: "desc" | "asc" | undefined;
    gradient?: (Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        type: "color_code";
        value: string;
    }>)[] | undefined;
    mapping?: Readonly<{} & {
        values: (string | number | Readonly<{} & {
            type: "range_key";
            from: string | number;
            to: string | number;
            ranges: Readonly<{} & {
                label: string;
                from: string | number;
                to: string | number;
            }>[];
        }> | Readonly<{} & {
            keys: string[];
            type: "multi_field_key";
        }>)[];
    }>[] | undefined;
    unassignedColor?: Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        type: "color_code";
        value: string;
    }> | undefined;
} & {
    palette: string;
    mode: "gradient";
}>>;
export declare const allColoringTypeSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    shift: boolean;
    type: "legacy_dynamic";
    palette: string;
    range: "absolute" | "percentage";
    steps: Readonly<{
        lt?: number | null | undefined;
        gte?: number | null | undefined;
        lte?: number | null | undefined;
    } & {
        color: string;
    }>[];
}> | Readonly<{} & {
    type: "dynamic";
    range: "absolute";
    steps: Readonly<{
        lt?: number | null | undefined;
        gte?: number | null | undefined;
        lte?: number | null | undefined;
    } & {
        color: string;
    }>[];
}> | Readonly<{} & {
    type: "dynamic";
    range: "percentage";
    steps: Readonly<{
        lt?: number | null | undefined;
        gte?: number | null | undefined;
        lte?: number | null | undefined;
    } & {
        color: string;
    }>[];
}> | Readonly<{} & {
    color: string;
    type: "static";
}> | Readonly<{
    unassignedColor?: Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        type: "color_code";
        value: string;
    }> | undefined;
} & {
    mapping: Readonly<{} & {
        values: (string | number | Readonly<{} & {
            type: "range_key";
            from: string | number;
            to: string | number;
            ranges: Readonly<{} & {
                label: string;
                from: string | number;
                to: string | number;
            }>[];
        }> | Readonly<{} & {
            keys: string[];
            type: "multi_field_key";
        }>)[];
        color: Readonly<{
            palette?: string | undefined;
        } & {
            type: "from_palette";
            index: number;
        }> | Readonly<{} & {
            type: "color_code";
            value: string;
        }>;
    }>[];
    palette: string;
    mode: "categorical";
}> | Readonly<{
    sort?: "desc" | "asc" | undefined;
    gradient?: (Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        type: "color_code";
        value: string;
    }>)[] | undefined;
    mapping?: Readonly<{} & {
        values: (string | number | Readonly<{} & {
            type: "range_key";
            from: string | number;
            to: string | number;
            ranges: Readonly<{} & {
                label: string;
                from: string | number;
                to: string | number;
            }>[];
        }> | Readonly<{} & {
            keys: string[];
            type: "multi_field_key";
        }>)[];
    }>[] | undefined;
    unassignedColor?: Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        type: "color_code";
        value: string;
    }> | undefined;
} & {
    palette: string;
    mode: "gradient";
}>>;
export type StaticColorType = TypeOf<typeof staticColorSchema>;
export type ColorByValueType = TypeOf<typeof colorByValueSchema>;
export type ColorByValueAbsolute = TypeOf<typeof colorByValueAbsoluteSchema> | TypeOf<typeof legacyColorByValueAbsoluteSchema>;
export type ColorByValueStep = TypeOf<typeof colorByValueStepSchema>;
export type ColorMappingType = TypeOf<typeof colorMappingSchema>;
export type ColorMappingCategoricalType = TypeOf<typeof categoricalColorMappingSchema>;
export type ColorMappingGradientType = TypeOf<typeof gradientColorMappingSchema>;
export type ColorMappingColorDefType = TypeOf<typeof colorDefSchema>;
export type AllColoringTypes = TypeOf<typeof allColoringTypeSchema>;
/**
 * Schema for where to apply the color (to value or background).
 */
export declare const applyColorToSchema: import("@kbn/config-schema").Type<"background" | "value">;
export {};
