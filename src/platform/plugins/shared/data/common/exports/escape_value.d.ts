type RawValue = string | object | null | undefined;
/**
 * Create a function that will escape CSV values like "=", "@" and "+" with a
 * "'". This will also place CSV values in "" if contain non-alphanumeric chars.
 *
 * For example:
 *
 * Given: =1+1
 * Returns: "'=1+1"
 *
 * See OWASP: https://www.owasp.org/index.php/CSV_Injection.
 */
export declare function createEscapeValue({ separator, quoteValues, escapeFormulaValues, }: {
    separator: string;
    quoteValues: boolean;
    escapeFormulaValues: boolean;
}): (val: RawValue) => string;
export {};
