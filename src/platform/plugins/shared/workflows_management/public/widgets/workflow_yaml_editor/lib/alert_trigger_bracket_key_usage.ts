/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface BracketDottedKeyMatch {
  /** 1-based line number */
  lineNumber: number;
  /** 1-based start column */
  startColumn: number;
  /** 1-based end column (exclusive) */
  endColumn: number;
  /** The matched text, e.g. ['kibana.alert.rule.name'] */
  text: string;
}

// Match ['...'] or ["..."] where the quoted string contains at least one dot
const BRACKET_DOTTED_KEY_PATTERN = /\['[^']*\.[^']*'\]|\["[^"]*\.[^"]*"\]/g;

/**
 * Detects if the YAML content uses bracket notation with dotted keys in variables,
 * e.g. `event.alerts[0]['kibana.alert.rule.name']` or `["kibana.alert.status"]`.
 * Such usage is deprecated in favor of dot notation when using alert triggers.
 */
export function hasBracketDottedKeyUsage(yamlContent: string): boolean {
  BRACKET_DOTTED_KEY_PATTERN.lastIndex = 0;
  return BRACKET_DOTTED_KEY_PATTERN.test(yamlContent);
}

/**
 * Finds all bracket-dotted-key usages with their line/column positions.
 */
export function findBracketDottedKeyUsages(yamlContent: string): BracketDottedKeyMatch[] {
  const matches: BracketDottedKeyMatch[] = [];
  const lines = yamlContent.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    BRACKET_DOTTED_KEY_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = BRACKET_DOTTED_KEY_PATTERN.exec(line)) !== null) {
      matches.push({
        lineNumber: lineIdx + 1,
        startColumn: match.index + 1,
        endColumn: match.index + match[0].length + 1,
        text: match[0],
      });
    }
  }

  return matches;
}
