/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CodeLine } from '../model';

import Selector from 'first-mate-select-grammar';
import Highlights from 'highlights';
const highlighter = new Highlights();

highlighter.loadGrammarsSync();

const selector = Selector();

export function tokenizeLines(filePath: string, fileContents: string): CodeLine[] {
  const grammar = selector.selectGrammar(highlighter.registry, filePath, fileContents);
  if (grammar) {
    return grammar.tokenizeLines(fileContents);
  } else {
    return [];
  }
}

export function computeRanges(lines: CodeLine[]) {
  let pos = 0;
  for (const line of lines) {
    let start = 0;
    for (const token of line) {
      const len = token.value.length;
      token.range = {
        start,
        end: start + len,
        pos,
      };
      start += len;
      pos += len;
    }
    pos += 1; // line break
  }
}

export function render(lines: CodeLine[]): string {
  let output = "<pre class='code'>";
  let lineNum = 0;
  for (const line of lines) {
    output += `<div class='code-line' data-line="${lineNum}">`;
    for (const token of line) {
      const lastScope = token.scopes[token.scopes.length - 1];
      const clazz = lastScope.replace(/\./g, ' ');
      output += `<span data-range="${token.range.start},${
        token.range.end
      }" class="${clazz}">${highlighter.escapeString(token.value)}</span>`;
    }
    output += '\n</div>';
    lineNum++;
  }

  return output + '</pre>';
}
