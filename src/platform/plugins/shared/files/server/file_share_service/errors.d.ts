declare abstract class FileShareError extends Error {
    constructor(message: string);
}
export declare class ExpiryDateInThePastError extends FileShareError {
}
export declare class FileShareNotFoundError extends FileShareError {
}
export declare class FileShareTokenInvalidError extends FileShareError {
}
export {};
