/**
 * Format configuration
 */
export declare const formatTypeSchema: import("@kbn/config-schema").Type<Readonly<{
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
}> | Readonly<{
    suffix?: string | undefined;
} & {
    from: string;
    to: string;
    type: "duration";
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
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
};
