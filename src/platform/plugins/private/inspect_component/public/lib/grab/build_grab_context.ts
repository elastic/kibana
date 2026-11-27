/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ANONYMOUS_COMPONENT_NAME, getComponentStack } from '@kbn/react-fiber';
import type { ComponentStackFrame, ReactFiberNode } from '@kbn/react-fiber';

const MAX_STACK_DEPTH = 10;
/** Frames this close to the element are always kept, further out only module transitions are. */
const CLOSEST_FRAMES = 3;
const MAX_TEXT_LENGTH = 80;
const MAX_SNIPPET_LENGTH = 500;
/** Directories a plugin or package keeps its sources in, the path before them identifies the module. */
const MODULE_SOURCE_DIRECTORIES = ['public', 'server', 'common', 'src'];
/** Path segments identifying a module without a source directory, e.g. `src/platform/packages/shared/react`. */
const MODULE_PATH_SEGMENTS = 5;
/** Wrappers that only run JSX written elsewhere: providers, boundaries and higher order components. */
const WRAPPER_NAME_PATTERN = /Provider|Boundary|HOC$/;
/** Modules that only wrap applications: routing, link handling, error boundaries and rendering context. */
const WRAPPER_MODULE_PATHS = [
  'shared-ux/router/',
  'shared-ux/link/redirect_app/',
  'shared-ux/error_boundary/',
  'react/kibana_context/',
  'react/kibana_mount/',
];

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
 * The plugin or package a repository relative path belongs to: the path up to its source
 * directory, not counting the repository level `src`.
 */
const getModuleKey = (path: string): string => {
  const segments = path.split('/');
  const sourceIndex = segments.findIndex(
    (segment, index) => index > 0 && MODULE_SOURCE_DIRECTORIES.includes(segment)
  );

  return segments.slice(0, sourceIndex === -1 ? MODULE_PATH_SEGMENTS : sourceIndex).join('/');
};

/** A frame of a wrapper component, or one located inside a wrapper module, e.g. a `Route`'s own JSX. */
const isWrapperFrame = ({ name, source }: ComponentStackFrame): boolean =>
  name === ANONYMOUS_COMPONENT_NAME ||
  WRAPPER_NAME_PATTERN.test(name) ||
  WRAPPER_MODULE_PATHS.some((modulePath) => source.fileName.includes(modulePath));

/**
 * Keeps the frames an agent can act on. Wrapper frames are dropped, consecutive frames of the
 * same file or component are collapsed and beyond the closest frames only the ones where the
 * stack crosses into another plugin or package are kept. The closest frame is always kept.
 * Without `getModule` modules can't be told apart, so only the wrapper and file rules apply.
 */
const pruneStack = (
  stack: ComponentStackFrame[],
  getModule: ((frame: ComponentStackFrame) => string) | null
): ComponentStackFrame[] => {
  const kept: ComponentStackFrame[] = [];

  for (const [index, frame] of stack.entries()) {
    if (kept.length === MAX_STACK_DEPTH) break;
    if (index > 0 && isWrapperFrame(frame)) continue;

    const previous = kept[kept.length - 1];

    if (previous) {
      const isSameModule = getModule !== null && getModule(previous) === getModule(frame);
      const isSameFile = previous.source.fileName === frame.source.fileName;
      const isSameComponent = isSameModule && previous.name === frame.name;

      if (isSameFile || isSameComponent) continue;
      if (kept.length >= CLOSEST_FRAMES && isSameModule) continue;
    }

    kept.push(frame);
  }

  return kept;
};

/**
 * Builds an agent friendly description of an element: its HTML snippet followed by
 * the pruned component stack, one `in Component (path:line:column)` line per frame.
 */
export const buildGrabContext = ({ element, fiber, repoRoot }: BuildGrabContextOptions): string => {
  const toRepoPath = (fileName: string) =>
    repoRoot && fileName.startsWith(repoRoot) ? fileName.slice(repoRoot.length) : fileName;
  /** Modules are told apart by repository relative path, so not until the root is known. */
  const getModule = repoRoot
    ? ({ source }: ComponentStackFrame) => getModuleKey(toRepoPath(source.fileName))
    : null;

  const stack = fiber ? pruneStack(getComponentStack(fiber), getModule) : [];
  const stackLines = stack.map(
    ({ name, source: { fileName, lineNumber, columnNumber } }) =>
      `  in ${name} (${toRepoPath(fileName)}:${lineNumber}:${columnNumber})`
  );

  return [getElementSnippet(element), ...stackLines].join('\n');
};
