/**
 * Gets a field value from a document, checking both ECS and OpenTelemetry field names.
 * First checks the primary ECS field, then falls back to OTel equivalent fields if defined.
 *
 * @param document - The document object (flattened)
 * @param ecsFieldName - The ECS field name to look up
 * @returns Object with the actual field name found and its value, or undefined field if not found
 */
export declare function getFieldValueWithFallback(document: Record<string, unknown>, ecsFieldName: string): {
    field: string | undefined;
    value: unknown;
};
/**
 * Gets multiple field values with OTel fallbacks, returning the first non-undefined value.
 * Useful for checking a ranked list of fields (e.g., message → error.message → event.original).
 *
 * @param document - The document object (flattened)
 * @param ecsFieldNames - Array of ECS field names to check in order
 * @returns Object with the actual field name and value that was found, or undefined field if none found
 */
export declare function getFirstAvailableFieldValue(document: Record<string, unknown>, ecsFieldNames: readonly string[]): {
    field: string | undefined;
    value?: unknown;
};
