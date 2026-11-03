/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFiberType } from '../fiber/get_fiber_type';
import { isEui, isExcludedComponent, isHtmlTag } from '../utils';
import type { DebugSource, ReactFiberNode } from '../fiber/types';

/** Maximum number of component stack frames included in the context. */
const MAX_STACK_DEPTH = 10;
/** Maximum length of the inspected element text content included in the HTML snippet. */
const MAX_TEXT_LENGTH = 80;
/** Maximum length of the HTML snippet. */
const MAX_SNIPPET_LENGTH = 500;

interface ComponentStackFrame {
  /** Display name of the component which renders the JSX located at {@link source}. */
  name: string;
  /** {@link DebugSource} */
  source: DebugSource;
}

export interface BuildGrabContextOptions {
  /** The inspected HTML element. */
  element: HTMLElement;
  /** {@link ReactFiberNode} */
  targetFiberNode: ReactFiberNode | null;
  /** Absolute repository root path (with trailing separator) stripped from all file paths, see {@link getRepoRoot}. */
  repoRoot?: string | null;
}

const isSourceComponent = (type: string) =>
  !isHtmlTag(type) && !isEui(type) && !isExcludedComponent(type);

const findOwnerName = (fiber: ReactFiberNode): string | null => {
  let owner = fiber._debugOwner;

  while (owner) {
    const type = getFiberType(owner);
    if (type && isSourceComponent(type)) {
      return type;
    }
    owner = owner._debugOwner;
  }

  return null;
};

/**
 * Walks up the owner chain pairing each JSX source location with the component which rendered it,
 * similar to React component stacks. Fibers without source (e.g. compiled EUI internals) are skipped.
 */
const getComponentStack = (fiber: ReactFiberNode): ComponentStackFrame[] => {
  const frames: ComponentStackFrame[] = [];
  let current: ReactFiberNode | null | undefined = fiber;

  while (current && frames.length < MAX_STACK_DEPTH) {
    const source = current._debugSource;
    const name = source ? findOwnerName(current) : null;

    if (source && name) {
      frames.push({ name, source });
    }
    current = current._debugOwner;
  }

  return frames;
};

const truncate = (text: string, maxLength: number) =>
  text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;

/** Serializes the element as its own tag wrapping its (truncated) text content, children are stripped. */
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

const getBaseFileName = (fileName: string) => fileName.split(/[\\/]/).pop();

/** Builds the label displayed while hovering in grab mode, e.g. `SaveButton · save_button.tsx:42`. */
export const getGrabLabel = (componentName: string, source: DebugSource): string =>
  `${componentName} · ${getBaseFileName(source.fileName)}:${source.lineNumber}`;

/**
 * Builds a plain text description of the inspected element meant to be pasted into a coding agent:
 * an HTML snippet followed by the component stack with repository relative source locations.
 */
export const buildGrabContext = ({
  element,
  targetFiberNode,
  repoRoot,
}: BuildGrabContextOptions): string => {
  const toRepoPath = (fileName: string) =>
    repoRoot && fileName.startsWith(repoRoot) ? fileName.slice(repoRoot.length) : fileName;

  const stack = targetFiberNode ? getComponentStack(targetFiberNode) : [];
  const stackLines = stack.map(
    ({ name, source: { fileName, lineNumber, columnNumber } }) =>
      `  in ${name} (${toRepoPath(fileName)}:${lineNumber}:${columnNumber})`
  );

  return [getElementSnippet(element), ...stackLines].join('\n');
};
