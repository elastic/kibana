declare class FileError extends Error {
    constructor(message?: string);
}
export declare class ContentAlreadyUploadedError extends FileError {
}
export declare class NoDownloadAvailableError extends FileError {
}
export declare class UploadInProgressError extends FileError {
}
export declare class AlreadyDeletedError extends FileError {
}
export declare class AbortedUploadError extends FileError {
}
export {};
