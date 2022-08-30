/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';

export const desc = (str: TemplateStringsArray, vars?: any[]) => {
  const sourceLines = dedent(str, vars)
    .split('\n')
    .map((l) => l.trim());
  const lines: string[] = [];
  for (const line of sourceLines) {
    if (line === '') {
      lines.push('', '');
      continue;
    }

    const existing = lines.length ? lines.pop() : '';
    lines.push(existing ? `${existing} ${line}` : line);
  }
  return lines.join('\n');
};
