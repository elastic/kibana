/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A problem the check wrote about one action, as markdown. The message is a sentence the check
 * composed, so what it quotes is found by what it looks like, and set in code spans to read as
 * the request, pointer or value it is.
 */

import { code, plural } from './issue_markdown';

/** The issues a recorded reason links to, as `[#123](url)`. */
export const issueLinksOf = (reason: string): string[] =>
  [...reason.matchAll(/https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/(\d+)/g)].map(
    ([url, number]) => `[#${number}](${url})`
  );

type Replacer = (match: string, ...groups: string[]) => string;

// Applies `replace` to the text outside code spans only.
const outsideCode = (text: string, pattern: RegExp, replace: Replacer): string =>
  text
    .split(/(`[^`]*`)/)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part.replace(pattern, (match, ...groups) => replace(match, ...groups))
    )
    .join('');

const HTTP_METHOD = '(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)';

// What a problem quotes, in code spans: the request, JSON pointers, the values compared, quoted
// values, header names and the artifacts to fix.
const PROBLEM_CODE_SPANS: ReadonlyArray<readonly [RegExp, Replacer]> = [
  // `POST https://api.example.com/scan breaks the spec: …` names the request, then why.
  [
    new RegExp(`^(${HTTP_METHOD} \\S+) breaks the spec: `),
    (_: string, request: string) => `${code(request)} `,
  ],
  [new RegExp(`\\b(${HTTP_METHOD} [^\\s;,]+)`, 'g'), (_: string, request: string) => code(request)],
  [/\bat (\/[^\s:]*):/g, (_: string, pointer: string) => `at ${code(pointer)}:`],
  [
    /(-?\d+(?:\.\d+)?) (is (?:greater|less) than(?: or equal to)?) (-?\d+(?:\.\d+)?)/g,
    (_: string, value: string, comparison: string, limit: string) =>
      `${code(value)} ${comparison} ${code(limit)}`,
  ],
  [
    /\((\d+) ([<>]=?) (\d+)\)/g,
    (_: string, value: string, comparison: string, limit: string) =>
      `(${code(value)} ${comparison} ${code(limit)})`,
  ],
  [/"([^"]+)"/g, (_: string, quoted: string) => code(quoted)],
  [/'(\w+)'/g, (_: string, quoted: string) => code(quoted)],
  [/\bexpected header (\S+)/g, (_: string, name: string) => `expected header ${code(name)}`],
  [/\bexpected ([A-Z][\w-]*: \S+)/g, (_: string, header: string) => `expected ${code(header)}`],
  [/\b(overlay\.yaml|manifest\.json|fixtures\.json)\b/g, (_: string, file: string) => code(file)],
];

/** A problem's message, with what it quotes in code spans. */
export const problemText = (problem: string): string =>
  PROBLEM_CODE_SPANS.reduce(
    (text, [pattern, replace]) => outsideCode(text, pattern, replace),
    problem
  );

/** The first of an action's problems, saying how many more it has. */
export const firstProblem = (problems: readonly string[]): string =>
  `${problemText(problems[0])}${
    problems.length > 1 ? ` (and ${plural(problems.length - 1, 'more problem')})` : ''
  }`;
