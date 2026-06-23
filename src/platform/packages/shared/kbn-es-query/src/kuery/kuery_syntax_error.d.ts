interface KQLSyntaxErrorData extends Error {
    found: string;
    expected: KQLSyntaxErrorExpected[] | null;
    location: any;
}
interface KQLSyntaxErrorExpected {
    description?: string;
    text?: string;
    type: string;
}
/**
 * A type of error indicating KQL syntax errors
 * @public
 */
export declare class KQLSyntaxError extends Error {
    shortMessage: string;
    constructor(error: KQLSyntaxErrorData, expression: any);
}
export {};
