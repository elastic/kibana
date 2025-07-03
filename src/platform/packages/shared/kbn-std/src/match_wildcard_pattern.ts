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

  if (parts.length === 1) {
    return text === parts[0];
  }

  let pos = 0;

  if (!text.startsWith(parts[0])) {
    return false;
  }
  pos = parts[0].length;

  for (let i = 1; i < parts.length - 1; i++) {
    const found = text.indexOf(parts[i], pos);
    if (found === -1) {
      return false;
    }
    pos = found + parts[i].length;
  }

  const lastPart = parts[parts.length - 1];

  // Check if last part fits without overlapping previous matches
  // for example, "a*ab" shoud not match "ab" even though it ends with "ab"
  return text.endsWith(lastPart) && pos <= text.length - lastPart.length;
};
