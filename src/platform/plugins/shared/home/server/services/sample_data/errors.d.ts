export declare class SampleDataInstallError extends Error {
    readonly httpCode: number;
    constructor(message: string, httpCode: number);
}
