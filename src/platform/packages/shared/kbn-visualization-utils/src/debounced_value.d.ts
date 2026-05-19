/**
 * Debounces value changes and updates inputValue on root state changes if no debounced changes
 * are in flight because the user is currently modifying the value.
 *
 * * allowFalsyValue: update upstream with all falsy values but null or undefined
 * * wait: debounce timeout
 */
export declare const useDebouncedValue: <T>({ onChange, value, defaultValue, }: {
    onChange: (val: T) => void;
    value: T;
    defaultValue?: T;
}, { allowFalsyValue, wait }?: {
    allowFalsyValue?: boolean;
    wait?: number;
}) => {
    inputValue: T;
    handleInputChange: (val: T) => void;
    initialValue: T;
};
