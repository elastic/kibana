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
 * @param _yaml - The YAML string to correct
 * @returns The corrected YAML string
 */
export function correctYamlSyntax(_yaml: string): string {
  let yaml = _yaml;

  // Fix unclosed quotes
  yaml = closeUnclosedQuotes(yaml);

  // Wrap special characters that need quotes
  yaml = wrapSpecialCharacters(yaml);

  return yaml;
}

/**
 * Closes unclosed quotes in the YAML string
 * @param yaml - The YAML string
 * @returns The YAML string with closed quotes
 */
function closeUnclosedQuotes(yaml: string): string {
  const lines = yaml.split('\n');
  const correctedLines: string[] = [];

  for (const line of lines) {
    let correctedLine = line;

    // Count quotes in the line
    const singleQuotes = (line.match(/'/g) || []).length;
    const doubleQuotes = (line.match(/"/g) || []).length;

    // If odd number of quotes, close them
    if (singleQuotes % 2 === 1) {
      // Check if the unclosed quote is at the beginning of a value
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const afterColon = line.substring(colonIndex + 1).trimStart();
        if (afterColon.startsWith("'") && !afterColon.endsWith("'")) {
          correctedLine = `${line}'`;
        }
      }
    }

    if (doubleQuotes % 2 === 1) {
      // Check if the unclosed quote is at the beginning of a value
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const afterColon = line.substring(colonIndex + 1).trimStart();
        if (afterColon.startsWith('"') && !afterColon.endsWith('"')) {
          correctedLine = `${line}"`;
        }
      }
    }

    correctedLines.push(correctedLine);
  }

  return correctedLines.join('\n');
}

/**
 * Wraps special characters that need to be quoted in YAML
 * @param yaml - The YAML string
 * @returns The YAML string with special characters wrapped
 */
function wrapSpecialCharacters(yaml: string): string {
  const lines = yaml.split('\n');
  const correctedLines: string[] = [];

  // Special characters that need to be quoted in YAML
  const specialCharacters = ['@', '!', '#', '$', '%', '^', '&', '*', '|', '\\', '>', '<', '?'];

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
        // Check if value contains special characters at the beginning
        const firstChar = value.charAt(0);

        // Skip YAML special indicators for multiline strings and folded scalars
        if (
          (firstChar === '|' || firstChar === '>') &&
          (value.length === 1 ||
            value.charAt(1) === '\n' ||
            /^\s/.test(value.charAt(1)) ||
            value.charAt(1) === '-' ||
            value.charAt(1) === '+')
        ) {
          // This is a YAML multiline string indicator, don't wrap it
          correctedLines.push(correctedLine);
          // eslint-disable-next-line no-continue
          continue;
        }

        // Handle braces and brackets specially
        if ((firstChar === '{' || firstChar === '[') && shouldWrapBrackets(value)) {
          correctedLine = `${line.substring(0, colonIndex)}:${leadingSpaces}"${value}"`;
        } else if (specialCharacters.includes(firstChar)) {
          // Wrap the entire value in quotes
          correctedLine = `${line.substring(0, colonIndex)}:${leadingSpaces}"${value}"`;
        } else if (value.includes('@') && !value.match(/^[\w.-]+@[\w.-]+$/)) {
          // Special case for @ symbol (unless it's an email-like pattern)
          correctedLine = `${line.substring(0, colonIndex)}:${leadingSpaces}"${value}"`;
        }
      }
    }

    correctedLines.push(correctedLine);
  }

  return correctedLines.join('\n');
}

/**
 * Checks if brackets/braces should be wrapped in quotes
 * @param value - The value starting with { or [
 * @returns True if the value should be wrapped
 */
function shouldWrapBrackets(value: string): boolean {
  const trimmed = value.trim();

  // Check for valid flow syntax patterns
  if (trimmed.startsWith('{')) {
    // Valid patterns: {}, { key: value }, { key: value, ... }
    // Invalid patterns: {object}, { object}, etc.

    // Empty object
    if (trimmed === '{}') return false;

    // Check if it's a valid flow mapping
    // Look for colon after the opening brace (with optional whitespace)
    const afterBrace = trimmed.substring(1).trim();
    if (afterBrace.startsWith('}')) return false; // {}

    // Check for key: value pattern
    const colonMatch = afterBrace.match(/^[^:,}]+:/);
    if (colonMatch) {
      // This looks like a valid flow mapping
      return false;
    }

    // Otherwise, it's likely invalid and should be wrapped
    return true;
  }

  if (trimmed.startsWith('[')) {
    // Valid patterns: [], [item1, item2], [ item1, item2 ]
    // Invalid patterns: [array], [ array], etc.

    // Empty array
    if (trimmed === '[]') return false;

    // Check if it ends with ]
    if (!trimmed.endsWith(']')) {
      // Incomplete array, might be valid when completed
      return false;
    }

    // For now, we'll be conservative and not wrap arrays
    // as they're more likely to be valid flow sequences
    return false;
  }

  return false;
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
