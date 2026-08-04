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
    gte?: number | null | undefined;
    lte?: number | null | undefined;
    lt?: number | null | undefined;
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
        gte?: number | null | undefined;
        lte?: number | null | undefined;
        lt?: number | null | undefined;
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
        gte?: number | null | undefined;
        lte?: number | null | undefined;
        lt?: number | null | undefined;
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
        gte?: number | null | undefined;
        lte?: number | null | undefined;
        lt?: number | null | undefined;
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
        gte?: number | null | undefined;
        lte?: number | null | undefined;
        lt?: number | null | undefined;
    } & {
        color: string;
    }>[]>;
}, "range"> & {
    range: import("@kbn/config-schema").Type<"percentage">;
}>;
export declare const colorByValuePaletteSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"distributed_palette">;
    palette: import("@kbn/config-schema").Type<"temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative">;
}>;
export declare const colorByValueSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    shift: boolean;
    type: "legacy_dynamic";
    range: "absolute" | "percentage";
    palette: string;
    steps: Readonly<{
        gte?: number | null | undefined;
        lte?: number | null | undefined;
        lt?: number | null | undefined;
    } & {
        color: string;
    }>[];
}> | Readonly<{} & {
    type: "dynamic";
    range: "absolute";
    steps: Readonly<{
        gte?: number | null | undefined;
        lte?: number | null | undefined;
        lt?: number | null | undefined;
    } & {
        color: string;
    }>[];
}> | Readonly<{} & {
    type: "dynamic";
    range: "percentage";
    steps: Readonly<{
        gte?: number | null | undefined;
        lte?: number | null | undefined;
        lt?: number | null | undefined;
    } & {
        color: string;
    }>[];
}> | Readonly<{} & {
    type: "distributed_palette";
    palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
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
    value: string;
    type: "color_code";
}>>;
declare const unassignedColorSchema: import("@kbn/config-schema").Type<Readonly<{
    palette?: string | undefined;
} & {
    type: "from_palette";
    index: number;
}> | Readonly<{} & {
    value: string;
    type: "color_code";
}>>;
declare const categoricalColorMappingSchema: import("@kbn/config-schema").ObjectType<{
    mode: import("@kbn/config-schema").Type<"categorical">;
    palette: import("@kbn/config-schema").Type<string>;
    mapping: import("@kbn/config-schema").Type<Readonly<{} & {
        values: (string | number | Readonly<{} & {
            from: string | number;
            to: string | number;
            type: "range_key";
            ranges: Readonly<{} & {
                from: string | number;
                to: string | number;
                label: string;
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
            value: string;
            type: "color_code";
        }>;
    }>[]>;
    unassigned: import("@kbn/config-schema").Type<Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        value: string;
        type: "color_code";
    }> | undefined>;
}>;
declare const gradientColorMappingSchema: import("@kbn/config-schema").ObjectType<{
    mode: import("@kbn/config-schema").Type<"gradient">;
    palette: import("@kbn/config-schema").Type<string>;
    sort: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
    mapping: import("@kbn/config-schema").Type<Readonly<{} & {
        values: (string | number | Readonly<{} & {
            from: string | number;
            to: string | number;
            type: "range_key";
            ranges: Readonly<{} & {
                from: string | number;
                to: string | number;
                label: string;
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
        value: string;
        type: "color_code";
    }>)[] | undefined>;
    unassigned: import("@kbn/config-schema").Type<Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        value: string;
        type: "color_code";
    }> | undefined>;
}>;
export declare const colorMappingSchema: import("@kbn/config-schema").Type<Readonly<{
    unassigned?: Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        value: string;
        type: "color_code";
    }> | undefined;
} & {
    mode: "categorical";
    mapping: Readonly<{} & {
        values: (string | number | Readonly<{} & {
            from: string | number;
            to: string | number;
            type: "range_key";
            ranges: Readonly<{} & {
                from: string | number;
                to: string | number;
                label: string;
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
            value: string;
            type: "color_code";
        }>;
    }>[];
    palette: string;
}> | Readonly<{
    sort?: "asc" | "desc" | undefined;
    gradient?: (Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        value: string;
        type: "color_code";
    }>)[] | undefined;
    mapping?: Readonly<{} & {
        values: (string | number | Readonly<{} & {
            from: string | number;
            to: string | number;
            type: "range_key";
            ranges: Readonly<{} & {
                from: string | number;
                to: string | number;
                label: string;
            }>[];
        }> | Readonly<{} & {
            keys: string[];
            type: "multi_field_key";
        }>)[];
    }>[] | undefined;
    unassigned?: Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        value: string;
        type: "color_code";
    }> | undefined;
} & {
    mode: "gradient";
    palette: string;
}>>;
export declare const noColorSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"none">;
}>;
export declare const autoColorSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"auto">;
}>;
export declare const allColoringTypeSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    shift: boolean;
    type: "legacy_dynamic";
    range: "absolute" | "percentage";
    palette: string;
    steps: Readonly<{
        gte?: number | null | undefined;
        lte?: number | null | undefined;
        lt?: number | null | undefined;
    } & {
        color: string;
    }>[];
}> | Readonly<{} & {
    type: "dynamic";
    range: "absolute";
    steps: Readonly<{
        gte?: number | null | undefined;
        lte?: number | null | undefined;
        lt?: number | null | undefined;
    } & {
        color: string;
    }>[];
}> | Readonly<{} & {
    type: "dynamic";
    range: "percentage";
    steps: Readonly<{
        gte?: number | null | undefined;
        lte?: number | null | undefined;
        lt?: number | null | undefined;
    } & {
        color: string;
    }>[];
}> | Readonly<{} & {
    type: "distributed_palette";
    palette: "temperature" | "complementary" | "status" | "gray" | "warm" | "positive" | "cool" | "negative";
}> | Readonly<{} & {
    type: "static";
    color: string;
}> | Readonly<{
    unassigned?: Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        value: string;
        type: "color_code";
    }> | undefined;
} & {
    mode: "categorical";
    mapping: Readonly<{} & {
        values: (string | number | Readonly<{} & {
            from: string | number;
            to: string | number;
            type: "range_key";
            ranges: Readonly<{} & {
                from: string | number;
                to: string | number;
                label: string;
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
            value: string;
            type: "color_code";
        }>;
    }>[];
    palette: string;
}> | Readonly<{
    sort?: "asc" | "desc" | undefined;
    gradient?: (Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        value: string;
        type: "color_code";
    }>)[] | undefined;
    mapping?: Readonly<{} & {
        values: (string | number | Readonly<{} & {
            from: string | number;
            to: string | number;
            type: "range_key";
            ranges: Readonly<{} & {
                from: string | number;
                to: string | number;
                label: string;
            }>[];
        }> | Readonly<{} & {
            keys: string[];
            type: "multi_field_key";
        }>)[];
    }>[] | undefined;
    unassigned?: Readonly<{
        palette?: string | undefined;
    } & {
        type: "from_palette";
        index: number;
    }> | Readonly<{} & {
        value: string;
        type: "color_code";
    }> | undefined;
} & {
    mode: "gradient";
    palette: string;
}> | Readonly<{} & {
    type: "none";
}> | Readonly<{} & {
    type: "auto";
}>>;
export type StaticColorType = TypeOf<typeof staticColorSchema>;
export type ColorByValueType = TypeOf<typeof colorByValueSchema>;
export type ColorByValuePaletteType = TypeOf<typeof colorByValuePaletteSchema>;
export type ColorByValueAbsolute = TypeOf<typeof colorByValueAbsoluteSchema> | TypeOf<typeof legacyColorByValueAbsoluteSchema>;
export type ColorByValueStep = TypeOf<typeof colorByValueStepSchema>;
export type ColorMappingType = TypeOf<typeof colorMappingSchema>;
export type ColorMappingCategoricalType = TypeOf<typeof categoricalColorMappingSchema>;
export type ColorMappingGradientType = TypeOf<typeof gradientColorMappingSchema>;
export type ColorMappingColorDefType = TypeOf<typeof colorDefSchema>;
export type NoColorType = TypeOf<typeof noColorSchema>;
export type AutoColorType = TypeOf<typeof autoColorSchema>;
export type AllColoringTypes = TypeOf<typeof allColoringTypeSchema>;
export type UnassignedColorType = TypeOf<typeof unassignedColorSchema>;
export declare const NO_COLOR: NoColorType;
export declare const AUTO_COLOR: AutoColorType;
export declare const DEFAULT_CATEGORICAL_COLOR_MAPPING: ColorMappingCategoricalType;
/**
 * Schema for where to apply the color (to value or background).
 */
export declare const applyColorToSchema: import("@kbn/config-schema").Type<"value" | "background">;
export {};
