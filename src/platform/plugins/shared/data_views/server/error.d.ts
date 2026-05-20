export declare class ErrorIndexPatternNotFound extends Error {
    readonly is404 = true;
    constructor(message: string);
}
export declare class ErrorIndexPatternFieldNotFound extends ErrorIndexPatternNotFound {
    constructor(indexPatternId: string, fieldName: string);
}
