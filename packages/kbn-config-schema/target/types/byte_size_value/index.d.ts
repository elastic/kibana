export declare type ByteSizeValueUnit = 'b' | 'kb' | 'mb' | 'gb';
export declare class ByteSizeValue {
    private readonly valueInBytes;
    static parse(text: string): ByteSizeValue;
    constructor(valueInBytes: number);
    isGreaterThan(other: ByteSizeValue): boolean;
    isLessThan(other: ByteSizeValue): boolean;
    isEqualTo(other: ByteSizeValue): boolean;
    getValueInBytes(): number;
    toString(returnUnit?: ByteSizeValueUnit): string;
}
export declare const bytes: (value: number) => ByteSizeValue;
export declare const kb: (value: number) => ByteSizeValue;
export declare const mb: (value: number) => ByteSizeValue;
export declare const gb: (value: number) => ByteSizeValue;
export declare const tb: (value: number) => ByteSizeValue;
export declare function ensureByteSizeValue(value?: ByteSizeValue | string | number): ByteSizeValue | undefined;
//# sourceMappingURL=index.d.ts.map