export declare const checkForTripleQuotesAndEsqlQuery: (text: string) => {
    insideTripleQuotes: boolean;
    insideEsqlQuery: boolean;
    esqlQueryIndex: number;
};
/**
 * This function unescapes chars that are invalid in a Console string.
 */
export declare const unescapeInvalidChars: (str: string) => string;
