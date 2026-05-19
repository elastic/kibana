export declare class CannotOverrideError extends Error {
    cause?: Error;
    constructor(message: string, cause?: Error);
}
export declare class SettingNotRegisteredError extends Error {
    constructor(key: string);
}
export declare class ValidationSettingNotFoundError extends Error {
    constructor(key: string);
}
export declare class ValidationBadValueError extends Error {
    constructor();
}
