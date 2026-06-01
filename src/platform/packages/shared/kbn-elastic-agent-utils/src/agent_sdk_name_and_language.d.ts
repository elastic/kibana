interface SdkNameAndLanguage {
    sdkName?: 'apm' | 'edot' | 'otel_other';
    language?: string;
}
export declare const getSdkNameAndLanguage: (agentName: string) => SdkNameAndLanguage;
export {};
