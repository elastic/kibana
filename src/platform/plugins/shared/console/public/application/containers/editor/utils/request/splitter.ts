/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Splits a concatenated string of JSON objects into individual JSON objects.
 *
 * This function takes a string containing one or more JSON objects concatenated together,
 * separated by optional whitespace, and splits them into an array of individual JSON strings.
 * It ensures that nested objects and strings containing braces do not interfere with the splitting logic.
 *
 * Example inputs:
 * - '{ "query": "test"} { "query": "test" }' -> ['{ "query": "test"}', '{ "query": "test" }']
 * - '{ "query": "test"}' -> ['{ "query": "test"}']
 * - '{ "query": "{a} {b}"}' -> ['{ "query": "{a} {b}"}']
 *
 */
export const splitRequestDataObjects = (dataString: string): string[] => {
  const jsonObjects = [];
  // Tracks the depth of nested braces
  let depth = 0;
  // Holds the current JSON object as we iterate
  let currentObject = '';
  // Tracks whether the current position is inside a string
  let insideString = false;
  // Tracks whether the current position is inside a triple-quote string
  let insideTripleQuoteString = false;

  let i = 0;
  // Iterate through each character in the input string
  while (i < dataString.length) {
    const char = dataString[i];
    // Append the character to the current JSON object string
    currentObject += char;

    if (char === '"' && dataString.substring(i + 1, i + 3) === '""') {
      // If the character is a quote and the next two characters are also quotes,
      // toggle the `insideString` state
      insideTripleQuoteString = !insideTripleQuoteString;
      currentObject += '""';
      // Skip the next two quotes
      i += 2;
    } else if (!insideTripleQuoteString && char === '"' && dataString[i - 1] !== '\\') {
      // If the character is a quote, it is not escaped, and it's not inside a triple-quote string,
      // toggle the `insideString` state
      insideString = !insideString;
    } else if (!insideTripleQuoteString && !insideString) {
      // Only modify depth if not inside a string

      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
      }

      // If depth is zero, we have completed a JSON object
      if (depth === 0) {
        jsonObjects.push(currentObject.trim());
        currentObject = '';
      }
    }
    i++;
  }

  // If there's remaining data in currentObject, add it as the last JSON object
  if (currentObject.trim()) {
    jsonObjects.push(currentObject.trim());
  }

  // Filter out any empty strings from the result array
  return jsonObjects.filter((obj) => obj !== '');
};
