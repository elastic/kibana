/**
 * Corrects the query syntax by closing any unclosed brackets and removing incomplete args.
 * @param offset
 * @param query
 * @returns
 */
export declare function correctQuerySyntax(query: string, offset: number): string;
