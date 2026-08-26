/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A stable, serializable address for a DOM element that can survive page
 * reloads on structurally identical pages.
 *
 * Uses a hybrid strategy: a structural CSS selector path as the primary
 * locator, with a content fingerprint as a confidence check. On import,
 * the path is resolved first; if the fingerprint mismatches, a warning
 * is surfaced rather than silently applying to the wrong element.
 */
export interface ElementPath {
  /**
   * Structural selector built from the element's position in the DOM
   * tree, e.g. `"body > div:nth-child(2) > header > nav > ul > li:nth-child(3)"`.
   */
  readonly selector: string;
  /**
   * Lightweight content fingerprint for disambiguation:
   * `"TAG|childCount|classHash|directTextSnippet"`.
   */
  readonly fingerprint: string;
}

const childIndex = (parent: Element, child: Element): number => {
  for (let i = 0; i < parent.children.length; i++) {
    if (parent.children[i] === child) return i + 1;
  }
  return 1;
};

/**
 * Build a structural CSS selector path from `el` up to (but not
 * including) `document`. Each segment is `tagName:nth-child(n)` to
 * uniquely identify the element among its siblings.
 *
 * @param el - The element to build a path for.
 * @returns A full selector string like `"body > div:nth-child(1) > p:nth-child(2)"`.
 */
const buildSelector = (el: Element): string => {
  const segments: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.documentElement) {
    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;

    if (!parent) {
      segments.unshift(tag);
      break;
    }

    segments.unshift(`${tag}:nth-child(${childIndex(parent, current)})`);
    current = parent;
  }

  return segments.join(' > ');
};

/**
 * Build a structural CSS selector path from `descendant` relative to
 * `root`. Returns `undefined` if `descendant` is not inside `root`,
 * or an empty string if they are the same element.
 *
 * @param root - The ancestor element to build the path from.
 * @param descendant - The descendant element to locate.
 * @returns A CSS selector path, or `undefined` if not inside `root`.
 */
export const buildRelativeSelector = (root: Element, descendant: Element): string | undefined => {
  if (root === descendant) return '';
  const segments: string[] = [];
  let current: Element | null = descendant;

  while (current && current !== root) {
    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (!parent) return undefined;

    segments.unshift(`${tag}:nth-child(${childIndex(parent, current)})`);
    current = parent;
  }

  if (current !== root) return undefined;
  return segments.join(' > ');
};

/**
 * Collect only the element's own direct Text node content, ignoring
 * text inside child elements. This prevents unstable descendant content
 * (badge counters, timestamps, loading spinners) from invalidating the
 * fingerprint of a parent container.
 */
const directTextContent = (el: Element): string => {
  let text = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
    }
  }
  return text.trim();
};

/**
 * Build a lightweight content fingerprint for an element.
 * Format: `"TAG|childCount|classSnippet|directText"`.
 *
 * Uses only the element's own characteristics (tag, direct child count,
 * class names, and direct text nodes) so that changes deep in the subtree
 * don't cause spurious mismatches.
 *
 * Not a cryptographic hash — a best-effort disambiguation check for
 * import validation. The class snippet is truncated to 80 characters
 * to keep paths compact while remaining unique enough for structural
 * comparison.
 */
const buildContentFingerprint = (el: Element): string => {
  const tag = el.tagName;
  const rawClass = typeof el.className === 'string' ? el.className : String(el.className ?? '');
  const classSnippet = rawClass.slice(0, 80);
  const textSnippet = directTextContent(el).slice(0, 50);
  const childCount = el.children.length;
  return `${tag}|${childCount}|${classSnippet}|${textSnippet}`;
};

/**
 * Resolves a DOM element to a stable {@link ElementPath}.
 *
 * @param el - The element to address.
 * @returns A path that can be serialized to JSON and resolved later.
 */
export const toPath = (el: Element): ElementPath => ({
  selector: buildSelector(el),
  fingerprint: buildContentFingerprint(el),
});

/**
 * Result of attempting to resolve an {@link ElementPath} back to a DOM
 * element.
 */
interface ResolveResult {
  /** The resolved element, or `null` if the selector matched nothing. */
  element: Element | null;
  /**
   * Whether the fingerprint matched. `false` means the element was found
   * by selector but its content has changed. The caller should surface
   * a warning.
   */
  fingerprintMatch: boolean;
}

/**
 * Resolves an {@link ElementPath} back to a DOM element.
 *
 * Uses `querySelector` with the structural selector. If the element is
 * found, checks the fingerprint for confidence. If the fingerprint
 * mismatches, `fingerprintMatch` is `false` and the caller decides
 * whether to proceed or warn.
 *
 * @param path - The path to resolve.
 * @returns A result with the element and fingerprint match status.
 */
export const fromPath = (path: ElementPath): ResolveResult => {
  const element = document.querySelector(path.selector);
  if (!element) {
    return { element: null, fingerprintMatch: false };
  }
  const currentFingerprint = buildContentFingerprint(element);
  return {
    element,
    fingerprintMatch: currentFingerprint === path.fingerprint,
  };
};
