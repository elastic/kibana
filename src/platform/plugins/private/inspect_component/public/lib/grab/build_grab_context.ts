/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getComponentStack } from '@kbn/react-fiber';
import type { ReactFiberNode } from '@kbn/react-fiber';

const MAX_STACK_DEPTH = 10;
const MAX_TEXT_LENGTH = 80;
const MAX_SNIPPET_LENGTH = 500;

export interface BuildGrabContextOptions {
  /** The inspected HTML element. */
  element: HTMLElement;
  /** {@link ReactFiberNode} */
  fiber: ReactFiberNode | null;
  /** Absolute repository root path (with trailing separator) stripped from all file paths, see {@link getRepoRoot}. */
  repoRoot?: string | null;
}

const truncate = (text: string, maxLength: number) =>
  text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;

/** Serializes the element without its children, keeping a trimmed version of its text. */
const getElementSnippet = (element: HTMLElement): string => {
  const snippet = element.cloneNode(false) as HTMLElement;
  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();

  if (text) {
    snippet.textContent = truncate(text, MAX_TEXT_LENGTH);
  }

  return truncate(snippet.outerHTML, MAX_SNIPPET_LENGTH);
};

/** Derives the absolute repository root from an absolute file name and its repository relative path. */
export const getRepoRoot = (fileName: string, relativePath: string): string | null =>
  relativePath && fileName.endsWith(relativePath)
    ? fileName.slice(0, fileName.length - relativePath.length)
    : null;

/**
 * Builds an agent friendly description of an element: its HTML snippet followed by
 * the component stack, one `in Component (path:line:column)` line per frame.
 */
export const buildGrabContext = ({ element, fiber, repoRoot }: BuildGrabContextOptions): string => {
  const toRepoPath = (fileName: string) =>
    repoRoot && fileName.startsWith(repoRoot) ? fileName.slice(repoRoot.length) : fileName;

  const stack = fiber ? getComponentStack(fiber).slice(0, MAX_STACK_DEPTH) : [];
  const stackLines = stack.map(
    ({ name, source: { fileName, lineNumber, columnNumber } }) =>
      `  in ${name} (${toRepoPath(fileName)}:${lineNumber}:${columnNumber})`
  );

  return [getElementSnippet(element), ...stackLines].join('\n');
};
