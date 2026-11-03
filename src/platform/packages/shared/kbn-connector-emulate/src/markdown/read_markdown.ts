/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldConstraints } from './types';

export interface MarkdownSection {
  readonly heading: string;
  /** The section's lines up to its first subsection. */
  readonly lines: readonly string[];
  readonly subsections: readonly MarkdownSection[];
}

export interface MarkdownPage {
  /** The `#` heading. */
  readonly title: string;
  /** The lines between the title and the first `##` section. */
  readonly intro: readonly string[];
  /** `##` sections, with their `###` subsections. */
  readonly sections: readonly MarkdownSection[];
}

const HEADING = /^(#{1,3})\s+(.*?)\s*$/;
const FENCE = /^\s*```/;

interface MutableSection {
  heading: string;
  lines: string[];
  subsections: MutableSection[];
}

/** Splits a page into its title, intro and sections, ignoring `#` lines in code blocks. */
export const readMarkdownPage = (markdown: string): MarkdownPage => {
  let title = '';
  const intro: string[] = [];
  const sections: MutableSection[] = [];
  let current: MutableSection | undefined;
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = fenced ? null : HEADING.exec(line);
    if (FENCE.test(line)) {
      fenced = !fenced;
    }
    if (heading && heading[1].length === 1 && !title) {
      title = heading[2];
    } else if (heading && heading[1].length === 2) {
      current = { heading: heading[2], lines: [], subsections: [] };
      sections.push(current);
    } else if (heading && heading[1].length === 3 && sections.length > 0) {
      current = { heading: heading[2], lines: [], subsections: [] };
      sections[sections.length - 1].subsections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      intro.push(line);
    }
  }
  return { title, intro, sections };
};

/** The section with this heading, ignoring case. */
export const findSection = (
  { sections }: MarkdownPage,
  heading: string
): MarkdownSection | undefined =>
  sections.find((section) => section.heading.toLowerCase() === heading.toLowerCase());

/** Parses the first JSON code block in the lines, if any. */
export const readJsonBlock = (lines: readonly string[]): unknown => {
  const start = lines.findIndex((line) => /^\s*```json\s*$/i.test(line));
  const end = lines.findIndex((line, index) => index > start && FENCE.test(line));
  if (start === -1 || end === -1) {
    return undefined;
  }
  try {
    return JSON.parse(lines.slice(start + 1, end).join('\n'));
  } catch {
    return undefined;
  }
};

const splitRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'));

/** Reads the first pipe table in the lines as rows keyed by its header cells. */
export const readTable = (lines: readonly string[]): Array<Record<string, string>> => {
  const start = lines.findIndex((line) => line.trim().startsWith('|'));
  if (start === -1 || !/^\s*\|[\s|:-]+\|\s*$/.test(lines[start + 1] ?? '')) {
    return [];
  }
  const header = splitRow(lines[start]);
  const rows: Array<Record<string, string>> = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.trim().startsWith('|')) {
      break;
    }
    const cells = splitRow(line);
    rows.push(Object.fromEntries(header.map((name, index) => [name, cells[index] ?? ''])));
  }
  return rows;
};

/** The text of a cell's code span, such as `q` in `` `q` ``. */
export const unquote = (cell: string): string =>
  /^`([^`]*)`$/.exec(cell.trim())?.[1] ?? cell.trim();

/** Bounds on a value, its length (`characters`) or its item count (`items`). */
export const toBounds = (
  minimum: number | undefined,
  maximum: number | undefined,
  unit?: string
): FieldConstraints => {
  const [min, max] =
    unit === 'characters'
      ? (['minLength', 'maxLength'] as const)
      : unit === 'items'
      ? (['minItems', 'maxItems'] as const)
      : (['minimum', 'maximum'] as const);
  return {
    ...(minimum === undefined || !Number.isFinite(minimum) ? {} : { [min]: minimum }),
    ...(maximum === undefined || !Number.isFinite(maximum) ? {} : { [max]: maximum }),
  };
};

/** Joins description lines, keeping blank lines as paragraph breaks. */
export const toDescription = (lines: readonly string[]): string | undefined => {
  const text = lines
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || undefined;
};
