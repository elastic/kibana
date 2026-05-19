export declare function getTypeI18n(type: string): string;
export declare const tinymathFunctions: Record<string, {
    section: 'math' | 'comparison';
    positionalArguments: Array<{
        name: string;
        optional?: boolean;
        defaultValue?: string | number;
        type?: string;
        alternativeWhenMissing?: string;
    }>;
    help: string;
    outputType?: string;
}>;
