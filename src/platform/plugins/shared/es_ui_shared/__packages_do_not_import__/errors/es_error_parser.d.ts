interface ParsedError {
    message: string;
    cause: string[];
}
export declare const getEsCause: (obj?: any, causes?: string[]) => string[];
export declare const parseEsError: (err: string) => ParsedError;
export {};
