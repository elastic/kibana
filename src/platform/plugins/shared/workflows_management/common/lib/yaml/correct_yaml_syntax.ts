/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
export function correctYamlSyntax(_yaml: string): string {
  return wrapDangerousCharacters(_yaml);
}

/**
 * Wraps characters that cause the YAML parser to silently produce incorrect values or crash.
 * @param yaml - The YAML string
 * @returns The YAML string with dangerous characters wrapped in quotes
 */
function wrapDangerousCharacters(yaml: string): string {
  const lines = yaml.split('\n');
  const correctedLines: string[] = [];

  // Characters that cause data loss or crashes when used as bare values in YAML
  const dangerousCharacters = ['!', '#', '&', '*'];

  for (const line of lines) {
    let correctedLine = line;

    // Skip comment lines
    if (line.trim().startsWith('#')) {
      correctedLines.push(correctedLine);
      // eslint-disable-next-line no-continue
      continue;
    }

    // Check if the line has a key-value pair
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const valueWithSpaces = line.substring(colonIndex + 1);
      const value = valueWithSpaces.trimStart();
      const leadingSpaces = valueWithSpaces.substring(0, valueWithSpaces.length - value.length);

      // Check if value needs to be wrapped
      if (value && !isAlreadyQuoted(value)) {
        const firstChar = value.charAt(0);

        // Handle | and > specially: only wrap if followed by non-whitespace
        // (i.e., not a valid multiline/folded scalar indicator like `|`, `|-`, `|+`, `> `)
        if (
          (firstChar === '|' || firstChar === '>') &&
          value.length > 1 &&
          value.charAt(1) !== '\n' &&
          !/^\s/.test(value.charAt(1)) &&
          value.charAt(1) !== '-' &&
          value.charAt(1) !== '+'
        ) {
          correctedLine = `${line.substring(0, colonIndex)}:${leadingSpaces}"${value}"`;
        } else if (dangerousCharacters.includes(firstChar)) {
          correctedLine = `${line.substring(0, colonIndex)}:${leadingSpaces}"${value}"`;
        }
      }
    }

    correctedLines.push(correctedLine);
  }

  return correctedLines.join('\n');
}

/**
 * Checks if a value is already quoted
 * @param value - The value to check
 * @returns True if the value is already quoted
 */
function isAlreadyQuoted(value: string): boolean {
  if (!value) return false;

  const trimmed = value.trim();
  return (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  );
}
