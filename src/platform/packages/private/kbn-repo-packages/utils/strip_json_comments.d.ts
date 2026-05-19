/**
 * @param {string} jsonString
 * @param {{ whitespace?: boolean; trailingCommas?: boolean }} options
 */
export function stripJsonComments(jsonString: string, { whitespace, trailingCommas }?: {
    whitespace?: boolean;
    trailingCommas?: boolean;
}): string;
