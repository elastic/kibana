export declare class CriticalError extends Error {
    code: string;
    processExitCode: number;
    cause?: Error | undefined;
    constructor(message: string, code: string, processExitCode: number, cause?: Error | undefined);
}
