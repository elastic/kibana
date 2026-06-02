export declare class FieldFormatNotFoundError extends Error {
    readonly formatId: string;
    constructor(message: string, formatId: string);
}
