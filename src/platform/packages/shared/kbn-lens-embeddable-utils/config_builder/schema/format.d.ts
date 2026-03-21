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
    type: "duration";
    from: string;
    to: string;
}> | Readonly<{} & {
    pattern: string;
    type: "custom";
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
};
