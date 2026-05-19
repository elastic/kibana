/**
 * Checks if field displayName or name matches the provided search string.
 * The search string can have wildcard.
 * @param field
 * @param fieldSearchHighlight
 */
export declare const fieldNameWildcardMatcher: (field: {
    name: string;
    displayName?: string;
}, fieldSearchHighlight: string) => boolean;
/**
 * Adapts fieldNameWildcardMatcher to combobox props.
 * @param field
 * @param fieldSearchHighlight
 */
export declare const comboBoxFieldOptionMatcher: ({ option: { name, label }, searchValue, }: {
    option: {
        name?: string;
        label: string;
    };
    searchValue: string;
}) => boolean;
/**
 * Get `highlight` string to be used together with `EuiHighlight`
 * @param displayName
 * @param fieldSearchHighlight
 */
export declare function getFieldSearchMatchingHighlight(displayName: string, fieldSearchHighlight?: string): string;
