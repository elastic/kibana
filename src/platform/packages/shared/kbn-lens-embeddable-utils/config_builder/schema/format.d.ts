/**
 * Format configuration for dimension values.
 * Accepts both GA and legacy unit names for the `duration` type so that neither is rejected at
 * the HTTP validation layer. The route handlers enforce exactly one set at runtime based on the
 * `asCode.useGASchemas` feature flag.
 */
export declare const formatTypeSchema: import("@kbn/config-schema").Type<Readonly<{
    suffix?: string | undefined;
} & {
    from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
    to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
    type: "duration";
}> | Readonly<{
    suffix?: string | undefined;
} & {
    from: string;
    to: string;
    type: "duration";
}> | Readonly<{
    suffix?: string | undefined;
} & {
    type: "number" | "percent";
    compact: boolean;
    decimals: number;
}> | Readonly<{
    suffix?: string | undefined;
} & {
    type: "bytes" | "bits";
    decimals: number;
}> | Readonly<{} & {
    type: "custom";
    pattern: string;
}>>;
export declare const formatSchema: {
    /**
     * Format configuration
     */
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
        to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
        type: "duration";
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
};
