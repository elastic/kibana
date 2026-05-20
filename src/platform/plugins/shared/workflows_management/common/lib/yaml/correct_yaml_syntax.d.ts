/**
 * This function attempts to correct the syntax of a partial YAML to make it valid.
 *
 * We are generally dealing with incomplete YAML when the user is typing. But,
 * having a valid YAML is helpful so we heuristically correct the syntax so it can be parsed.
 *
 * Only corrects characters that cause the YAML parser to silently lose data or crash:
 * - `!` — interpreted as a YAML tag, value becomes empty string
 * - `#` — interpreted as a comment, value becomes null
 * - `&` — creates a YAML anchor, value is lost
 * - `*` — creates a YAML alias, toJSON() throws ReferenceError
 * - `|` / `>` followed by non-whitespace — misinterpreted as block scalar header
 *
 * Other special characters (`@`, `$`, `%`, `^`, `\`, `<`, `?`) are handled correctly
 * by the YAML parser and do not need correction. Flow-style collections (`{...}`, `[...]`)
 * including multi-line JSON objects are also parsed correctly by the YAML parser.
 *
 * @param _yaml - The YAML string to correct
 * @returns The corrected YAML string
 */
export declare function correctYamlSyntax(_yaml: string): string;
