/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { extractJSONStringValues } from './parser';

export function collapseLiteralStrings(data: string) {
  const splitData = data.split(`"""`);
  for (let idx = 1; idx < splitData.length - 1; idx += 2) {
    splitData[idx] = JSON.stringify(splitData[idx]);
  }
  return splitData.join('');
}

// 5 megabytes
const MAX_EXPANDABLE_JSON_SIZE = 5 * 1024 * 1024;

/**
 * Takes in a string representing some JSON data and expands strings,
 * where needed, to a string literal representation.
 *
 * For example; given a value like: "{ "my_string": "\nhey!\n" }"
 *
 * Will return: "{ "my_string": """
 * hey!
 * """
 * }"
 */
export function expandLiteralStrings(data: string) {
  // Assuming 1 byte per char
  if (data.length > MAX_EXPANDABLE_JSON_SIZE) {
    return data;
  }

  const { stringValues } = extractJSONStringValues(data);

  if (stringValues.length === 0) {
    return data;
  }

  // Include JSON before our first string value
  let result = data.substring(0, stringValues[0].startIndex);

  for (let x = 0; x < stringValues.length; x++) {
    const { startIndex, endIndex } = stringValues[x];
    const candidate = data.substring(startIndex, endIndex + 1);

    // Handle a special case where we may have a value like "\"test\"". We don't
    // want to expand this to """"test"""" - so we terminate before processing the string
    // further if we detect this either at the start or end of the double quote section.
    const skip =
      (candidate[1] === '\\' && candidate[2] === '"') ||
      (candidate[candidate.length - 2] === '"' && candidate[candidate.length - 3] === '\\');

    if (!skip && candidate.match(/\\./)) {
      result += `"""${JSON.parse(candidate)}"""`;
    } else {
      result += candidate;
    }

    if (stringValues[x + 1]) {
      // Add any JSON between string values
      result += data.substring(endIndex + 1, stringValues[x + 1].startIndex);
    }
  }

  // Add any remaining JSON after all string values
  result += data.substring(stringValues[stringValues.length - 1].endIndex + 1);

  return result;
}
