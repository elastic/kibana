export declare const TYPE_GROUPS: {
    label: string;
    types: string[];
}[];
/**
 * Gets the field type name, if its not registered transform the field type into readable text.
 */
export declare const getFieldLabel: (type: string) => string;
export declare const getFieldIconType: (type: string) => string;
