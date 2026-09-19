/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IGNORE_SELECTOR, NAME_MAX_LENGTH, SELECTOR_MAX_LENGTH } from '../constants';
import type { AnchorLocator, AnchorTarget, ElementAnchor } from '../types';

const TEST_SUBJ_ATTR = 'data-test-subj';
/** Attributes locators are made of (see `buildAnchor`); with text, what a change of can make an anchor resolve differently. */
export const LOCATOR_ATTRIBUTES = ['id', TEST_SUBJ_ATTR, 'aria-label'];
const TEXT_MAX_LENGTH = 80;
const LABEL_MAX_LENGTH = 60;
const FINGERPRINT_TEXT_LENGTH = 40;
const MAX_TEST_SUBJ_SEGMENTS = 3;
const MAX_PROMOTE_CLIMB = 6;
/** Elements covering more of the viewport than this are containers, not commentable components. */
const MAX_ANCHOR_VIEWPORT_RATIO = 0.4;

/** Elements worth anchoring to; a click on their content is promoted to them. */
const SEMANTIC_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  'summary',
  'label',
  'img',
  'svg',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'li',
  'td',
  'th',
  'legend',
  'figure',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="combobox"]',
  '[role="gridcell"]',
  '[data-test-subj]',
].join(', ');

/** Tags cheap enough to compare by text across the whole document. */
const TEXT_LOCATOR_TAGS = new Set([
  'a',
  'button',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'label',
  'legend',
  'li',
  'p',
  'span',
  'summary',
  'td',
  'th',
]);

const collapse = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim();

const truncate = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const attributeSelector = (name: string, value: string): string =>
  `[${name}="${value.replace(/["\\]/g, '\\$&')}"]`;

/** Selectors come from stored comments, which anyone with access to the store can have written, so an invalid one is a miss rather than an exception. */
const queryAll = (root: ParentNode, selector: string): Element[] => {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    return [];
  }
};

const matches = (element: Element, selector: string): boolean => {
  try {
    return element.matches(selector);
  } catch {
    return false;
  }
};

export const isIgnored = (element: Element, ignoreSelectors: readonly string[] = []): boolean =>
  [IGNORE_SELECTOR, ...ignoreSelectors].some((selector) => element.closest(selector) !== null);

export const isVisible = (element: Element): boolean => {
  const { width, height } = element.getBoundingClientRect();
  return (width > 0 || height > 0) && getComputedStyle(element).visibility !== 'hidden';
};

export const isActionable = (element: Element): boolean => {
  if (
    !isVisible(element) ||
    matches(element, ':disabled') ||
    element.closest('[aria-disabled="true"], [inert]') !== null
  ) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
    return true;
  }
  const hit = document.elementFromPoint(x, y);
  return hit === null || element.contains(hit) || isIgnored(hit);
};

const isTooLarge = (element: Element): boolean => {
  const { width, height } = element.getBoundingClientRect();
  return width * height > MAX_ANCHOR_VIEWPORT_RATIO * window.innerWidth * window.innerHeight;
};

/** Promotes the element under the pointer to its nearest semantic ancestor, unless that ancestor covers most of the viewport. */
export const promoteToCommentable = (hit: Element): Element => {
  let current: Element | null = hit;
  for (let depth = 0; current && current !== document.body && depth < MAX_PROMOTE_CLIMB; depth++) {
    if (matches(current, SEMANTIC_SELECTOR)) {
      return isTooLarge(current) ? hit : current;
    }
    current = current.parentElement;
  }
  return hit;
};

const getTestSubj = (element: Element): string | undefined => {
  const value = element.getAttribute(TEST_SUBJ_ATTR)?.trim();
  return value && !value.includes(' > ') && !/["\\]/.test(value) ? value : undefined;
};

const testSubjSelector = (path: string): string =>
  path
    .split(' > ')
    .map((segment) => attributeSelector(TEST_SUBJ_ATTR, segment))
    .join(' ');

const closestTestSubjAncestor = (from: Element | null): Element | null => {
  let current = from;
  while (current && !getTestSubj(current)) {
    current = current.parentElement;
  }
  return current;
};

/** Shortest `data-test-subj` chain identifying `element` uniquely; when none does, the longest one, which resolution then treats as a miss. */
const buildTestSubjPath = (element: Element): string | undefined => {
  const own = getTestSubj(element);
  if (!own) {
    return undefined;
  }
  const segments = [own];
  let ancestor = closestTestSubjAncestor(element.parentElement);
  while (segments.length < MAX_TEST_SUBJ_SEGMENTS && ancestor) {
    const found = queryAll(document, testSubjSelector(segments.join(' > ')));
    if (found.length === 1 && found[0] === element) {
      break;
    }
    segments.unshift(getTestSubj(ancestor) ?? '');
    ancestor = closestTestSubjAncestor(ancestor.parentElement);
  }
  return segments.join(' > ');
};

/** Ids from id generators are not stable across mounts: uuids (EUI's `htmlIdGenerator`), React `useId` (`:r5:` / `«r5»`) and counters. */
export const looksGenerated = (id: string): boolean =>
  /[0-9a-f]{8}-[0-9a-f]{4}/i.test(id) || /\d{4,}/.test(id) || /:[\w-]*:|«[^»]*»/.test(id);

const segmentOf = (element: Element): string => {
  const tag = element.tagName.toLowerCase();
  const sameTag = Array.from(element.parentElement?.children ?? []).filter(
    (child) => child.tagName === element.tagName
  );
  return sameTag.length > 1 ? `${tag}:nth-of-type(${sameTag.indexOf(element) + 1})` : tag;
};

/** Selector of a stable ancestor to start a path from: its test subject or hand-written id, provided it is alone in the document with it. */
const stableRootSelector = (element: Element): string | undefined => {
  const subj = getTestSubj(element);
  const selector = subj
    ? attributeSelector(TEST_SUBJ_ATTR, subj)
    : element.id && !looksGenerated(element.id)
    ? attributeSelector('id', element.id)
    : undefined;
  return selector && queryAll(document, selector).length === 1 ? selector : undefined;
};

/** Child-combinator path down to `element`: from `root` (exclusive) when given, otherwise from the nearest ancestor with a unique test subject or hand-written id. */
export const buildCssPath = (element: Element, root?: Element): string => {
  const segments: string[] = [];
  let current: Element | null = element;
  while (current && current !== root) {
    if (!root && current !== element) {
      const stableRoot = stableRootSelector(current);
      if (stableRoot) {
        return [stableRoot, ...segments].join(' > ');
      }
    }
    segments.unshift(segmentOf(current));
    current = current.parentElement;
  }
  return segments.join(' > ');
};

/** Walks a path built by `buildCssPath(target, root)` one child level per segment (`:scope` is unreliable for SVG roots in some engines). */
const walkPath = (root: Element, path: string): Element[] =>
  path
    .split(' > ')
    .reduce<Element[]>(
      (level, segment) =>
        level.flatMap((parent) =>
          Array.from(parent.children).filter((child) => matches(child, segment))
        ),
      [root]
    );

const nameOf = (element: Element): string =>
  collapse(element.getAttribute('aria-label')) || collapse(element.textContent);

/** Short name of an element for hints: its accessible label or text, else its tag. */
export const labelOf = (element: Element): string =>
  truncate(nameOf(element), LABEL_MAX_LENGTH) || element.tagName.toLowerCase();

const fingerprintOf = (element: Element): string =>
  `${element.tagName.toLowerCase()}|${truncate(nameOf(element), FINGERPRINT_TEXT_LENGTH)}`;

const queryLocator = (locator: AnchorLocator): Element[] => {
  switch (locator.type) {
    case 'testSubj':
      return queryAll(document, testSubjSelector(locator.path));
    case 'id':
      return queryAll(document, attributeSelector('id', locator.value));
    case 'ariaLabel':
      return queryAll(document, attributeSelector('aria-label', locator.value));
    case 'text':
      return queryAll(document, locator.tag).filter(
        (candidate) => collapse(candidate.textContent) === locator.value
      );
    case 'cssPath':
      return queryAll(document, locator.selector);
  }
};

export interface BuildAnchorOptions {
  /** Viewport coordinates of the click; the pin is placed at the same relative offset. */
  point?: { x: number; y: number };
  /** Innermost element under the pointer; recorded as the pin's target when it lies inside `element`. */
  hit?: Element;
}

const relativePosition = (
  rect: DOMRect,
  point?: { x: number; y: number }
): Pick<ElementAnchor, 'relativeX' | 'relativeY'> => ({
  relativeX: point && rect.width > 0 ? clamp01((point.x - rect.left) / rect.width) : 0.5,
  relativeY: point && rect.height > 0 ? clamp01((point.y - rect.top) / rect.height) : 0.5,
});

const buildTarget = (
  element: Element,
  hit: Element,
  point?: { x: number; y: number }
): AnchorTarget | undefined => {
  if (hit === element || !element.contains(hit)) {
    return undefined;
  }
  const rect = hit.getBoundingClientRect();
  const path = buildCssPath(hit, element);
  if (rect.width === 0 || rect.height === 0 || path.length > SELECTOR_MAX_LENGTH) {
    return undefined;
  }
  return { path, fingerprint: fingerprintOf(hit), ...relativePosition(rect, point) };
};

/** Describes `element` with every locator that identifies it uniquely in the document, most stable first. */
export const buildAnchor = (
  element: Element,
  { point, hit = element }: BuildAnchorOptions = {}
): ElementAnchor => {
  const locators: AnchorLocator[] = [];
  const addIfUnique = (locator: AnchorLocator) => {
    const found = queryLocator(locator);
    if (found.length === 1 && found[0] === element) {
      locators.push(locator);
    }
  };

  const testSubjPath = buildTestSubjPath(element);
  if (testSubjPath && testSubjPath.length <= SELECTOR_MAX_LENGTH) {
    locators.push({ type: 'testSubj', path: testSubjPath });
  }
  if (element.id && !looksGenerated(element.id) && element.id.length <= SELECTOR_MAX_LENGTH) {
    addIfUnique({ type: 'id', value: element.id });
  }
  const ariaLabel = collapse(element.getAttribute('aria-label'));
  if (ariaLabel && ariaLabel.length <= NAME_MAX_LENGTH) {
    addIfUnique({ type: 'ariaLabel', value: ariaLabel });
  }
  const tag = element.tagName.toLowerCase();
  const text = collapse(element.textContent);
  if (TEXT_LOCATOR_TAGS.has(tag) && text && text.length <= TEXT_MAX_LENGTH) {
    addIfUnique({ type: 'text', tag, value: text });
  }
  const selector = buildCssPath(element);
  if (selector.length <= SELECTOR_MAX_LENGTH) {
    locators.push({ type: 'cssPath', selector, fingerprint: fingerprintOf(element) });
  }

  const target = buildTarget(element, hit, point);
  return {
    locators,
    ...relativePosition(element.getBoundingClientRect(), point),
    ...(target ? { target } : {}),
  };
};

export interface ResolvedAnchor {
  element: Element;
  /** False when only a structural path matched and its fingerprint differs (the element may have changed). */
  exact: boolean;
}

/**
 * Finds the element an anchor points at: the first locator matching exactly one
 * visible element. A structural path may match one element whose content
 * changed (an inexact match) but never picks among several: an ambiguous
 * locator, like one from a repeated component, is a miss.
 */
export const resolveAnchor = (anchor: ElementAnchor): ResolvedAnchor | null => {
  for (const locator of anchor.locators) {
    const found = queryLocator(locator).filter(isVisible);
    if (locator.type === 'cssPath') {
      const exactMatches = found.filter(
        (candidate) => fingerprintOf(candidate) === locator.fingerprint
      );
      if (exactMatches.length === 1) {
        return { element: exactMatches[0], exact: true };
      }
      if (exactMatches.length === 0 && found.length === 1) {
        return { element: found[0], exact: false };
      }
    } else if (found.length === 1) {
      return { element: found[0], exact: true };
    }
  }
  return null;
};

/** Viewport position of an anchor's pin: inside its target when that still resolves with the same content, otherwise proportional in the element. */
export const getAnchorPoint = (
  anchor: ElementAnchor,
  element: Element
): { x: number; y: number } => {
  const { target } = anchor;
  const targetElement = target
    ? walkPath(element, target.path)
        .filter(isVisible)
        .find((candidate) => fingerprintOf(candidate) === target.fingerprint)
    : undefined;
  const { relativeX, relativeY } = targetElement && target ? target : anchor;
  const rect = (targetElement ?? element).getBoundingClientRect();
  return { x: rect.left + rect.width * relativeX, y: rect.top + rect.height * relativeY };
};
