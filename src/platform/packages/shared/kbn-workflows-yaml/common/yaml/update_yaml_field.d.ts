/**
 * Updates a field in YAML while preserving comments, formatting, and blank lines.
 * This is useful when updating workflow metadata (like enabled, name, description, tags)
 * without losing user's formatting and comments.
 *
 * @param yamlString - The original YAML string
 * @param fieldPath - The dot-notated path to the field to update (e.g., 'enabled', 'name', 'parent.child')
 * @param value - The new value for the field
 * @returns The updated YAML string with formatting preserved
 */
export declare function updateYamlField(yamlString: string, fieldPath: string, value: unknown): string;
