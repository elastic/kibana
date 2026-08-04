export declare const durationInputUnitCompat: {
    /**
     * Converts an API input unit to the Lens state representation.
     * Accepts both GA short-form enums (e.g. `'min'`) and legacy names (e.g. `'m'`).
     */
    toState: (unit: string) => string;
    toAPI: (unit?: string) => "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
};
export declare const durationOutputUnitCompat: {
    /**
     * Converts an API output unit to the Lens state representation.
     * Accepts both GA short-form enums (e.g. `'auto'`, `'auto-approximate'`, `'min'`)
     * and legacy names (e.g. `'humanize'`, `'humanizePrecise'`, `'m'`).
     */
    toState: (unit: string) => string;
    toAPI: (unit?: string) => "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
};
/** Converts a GA `from` unit to the legacy API field-format name (e.g. `s` → `seconds`). */
export declare const gaDurationInputUnitToLegacyApi: (unit: string) => string;
/** Converts a GA `to` unit to the legacy API field-format name (e.g. `s` → `asSeconds`). */
export declare const gaDurationOutputUnitToLegacyApi: (unit: string) => string;
