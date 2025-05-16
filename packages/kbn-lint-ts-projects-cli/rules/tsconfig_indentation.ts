/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TsProjectRule } from '@kbn/repo-linter';
import { snip } from '@kbn/json-ast';

const INDENT = '  ';

class Scanner {
  public pos = 0;
  constructor(public readonly text: string) {}

  scanToClosing(final: string) {
    while (this.cont()) {
      const char = this.text[this.pos++];

      if (char === '\\') {
        this.pos++; // ignore next char
        continue;
      }

      if (char === final) {
        return;
      }
    }

    throw new Error(`expected to find closing "${final}"`);
  }

  collectAll(match: string) {
    let matched = '';
    while (this.cont()) {
      if (this.text[this.pos] === match) {
        matched += match;
        this.pos++;
      } else {
        break;
      }
    }
    return matched;
  }

  cont() {
    return this.pos < this.text.length;
  }

  peek() {
    return this.text[this.pos];
  }
}

function getIndentationSnips(text: string) {
  const scanner = new Scanner(text);
  let depth = 0;
  const snips: Array<[from: number, to: number, expected: string]> = [];
  while (scanner.cont()) {
    const char = scanner.text[scanner.pos++];

    if (char === '{' || char === '[') {
      depth += 1;
      continue;
    }

    if (char === '}' || char === ']') {
      depth -= 1;
      continue;
    }

    if (char === '"') {
      scanner.scanToClosing('"');
      continue;
    }

    if (char === '\n') {
      const indent = scanner.collectAll(' ');
      const next = scanner.peek();
      const expected = INDENT.repeat(
        next === '\n' ? 0 : next === '}' || next === ']' ? depth - 1 : depth
      );
      if (indent !== expected) {
        snips.push([scanner.pos - indent.length, scanner.pos, expected]);
      }
    }
  }
  return snips;
}

export const tsconfigIndentation = TsProjectRule.create('tsconfigIndentation', {
  check() {
    const content = this.get('tsconfig.json');
    const fixes = getIndentationSnips(content);

    if (fixes.length || !content.endsWith('\n')) {
      this.err('file should use two space indentation', {
        'tsconfig.json': (source) => {
          const fixed = snip(source, getIndentationSnips(source));
          return fixed.endsWith('\n') ? fixed : fixed + '\n';
        },
      });
    }
  },
});
