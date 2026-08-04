export interface UseQueryableEsqlColumnsResult {
    /**
     * Names of the columns that can be referenced in an ES|QL query against the
     * index pattern. `undefined` while resolution is in progress or after it
     * failed.
     */
    queryableColumns?: Set<string>;
    loading: boolean;
}
/**
 * Resolves the set of columns that can be referenced in an ES|QL query against
 * `indexPattern`. Referencing a column that is unmapped or inconsistently
 * mapped across the pattern's indices fails the whole query with
 * a verification_exception. The columns are resolved through ES|QL itself
 * (`FROM <pattern> | LIMIT 0`) rather than field caps, because field caps does
 * not surface all mapping conflicts that ES|QL rejects (a field mapped as
 * `object` in one index and `text` in another is reported by field caps as a
 * plain text field, but is an unsupported column in ES|QL).
 */
export declare function useQueryableEsqlColumns(indexPattern?: string): UseQueryableEsqlColumnsResult;
