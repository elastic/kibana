/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const matchWildcardPattern = ({ pattern, str }: { pattern: string; str: string }) => {
  const text = str.toLowerCase();
  const parts = pattern.toLowerCase().split('*');

  // If there are no wildcards, just do a direct comparison
  if (parts.length === 1) {
    return text === parts[0];
  }

  let pos = 0;

  // Check if the first part matches the start of the string
  if (!text.startsWith(parts[0])) {
    return false;
  }
  // Move position to the end of the first part
  pos = parts[0].length;

  // Check each middle part to see if it exists in the string in order
  for (let i = 1; i < parts.length - 1; i++) {
    // Search for the next part starting from the current position
    const found = text.indexOf(parts[i], pos);
    // If a part is not found, return false
    if (found === -1) {
      return false;
    }
    // Move the position to the end of the found part
    pos = found + parts[i].length;
  }

  // Last part
  const lastPart = parts[parts.length - 1];

  // Check if the last part matches the end of the string and
  // check if last part fits without overlapping previous matches
  // for example, "a*ab" shoud not match "ab" even though it ends with "ab"
  return text.endsWith(lastPart) && pos <= text.length - lastPart.length;
};
