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
/** Attributes locators are made of; a change to one (or to text) can make an anchor resolve differently. */
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

/** Selectors come from stored comments, which anyone with access to the store can write: an invalid one is a miss, not an exception. */
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

/** Viewport coordinates. */
export interface Point {
  x: number;
  y: number;
}

export const isOnScreen = ({ x, y }: Point): boolean =>
  x >= 0 && y >= 0 && x <= window.innerWidth && y <= window.innerHeight;

/** Hit-testing passes over such elements, as tooltips, to whatever is under them. */
const takesNoPointerInput = (element: Element): boolean =>
  getComputedStyle(element).pointerEvents === 'none';

/**
 * Whether `element` is what shows at `point`, a spot within it, rather than a
 * dialog, menu or bar drawn over it there (which would cover a pin at the spot
 * too). The layer's own UI does not count. Off screen, or taking no pointer
 * input, the element passes: there is nothing to test.
 */
export const isExposed = (element: Element, point: Point): boolean => {
  if (!isOnScreen(point) || takesNoPointerInput(element)) {
    return true;
  }
  const hit = document.elementsFromPoint(point.x, point.y).find((over) => !isIgnored(over));
  return hit === undefined || hit.contains(element) || element.contains(hit);
};

const TOOLTIP_SELECTOR = '[role="tooltip"]';

/** Farthest a tooltip is shown from the element that shows it (EUI keeps 16px). */
export const TOOLTIP_GAP = 32;

export type Box = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;

/** The distance between two boxes; 0 when they touch or overlap. */
export const gapBetween = (a: Box, b: Box): number =>
  Math.max(0, a.left - b.right, b.left - a.right, a.top - b.bottom, b.top - a.bottom);

/** Whether the element is in a tooltip: UI showing only while what it describes is hovered or focused. */
export const isInTooltip = (element: Element): boolean =>
  element.closest(TOOLTIP_SELECTOR) !== null;

/** The tooltips the element (or what it is in) is described by, as a trigger is while its tooltip shows. */
const tooltipsDescribing = (element: Element): Element[] =>
  (element.closest('[aria-describedby]')?.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .flatMap((id) => {
      const described = id ? document.getElementById(id) : null;
      return described && matches(described, TOOLTIP_SELECTOR) ? [described] : [];
    });

/** The element the tooltip describes or labels: the one that shows it. */
export const triggerOf = (tooltip: Element): Element | null => {
  if (!tooltip.id) {
    return null;
  }
  const id = tooltip.id.replace(/["\\]/g, '\\$&');
  return document.querySelector(`[aria-describedby~="${id}"], [aria-labelledby~="${id}"]`);
};

/** The page's tooltips showing, the last added first: not those of UI left out, nor of elements that are (the layer's own hints are portalled out of it). */
export const tooltipsShowing = (ignoreSelectors: readonly string[] = []): Element[] =>
  queryAll(document, TOOLTIP_SELECTOR)
    .reverse()
    .filter((tooltip) => {
      if (isIgnored(tooltip, ignoreSelectors) || !isVisible(tooltip)) {
        return false;
      }
      const trigger = triggerOf(tooltip);
      return trigger === null || !isIgnored(trigger, ignoreSelectors);
    });

/** The tooltip `trigger` shows, if showing: the one describing it, else (without the ARIA link) the nearest no farther than a tooltip is shown from its element. */
export const tooltipShowing = (
  trigger: Element,
  ignoreSelectors: readonly string[] = []
): Element | null => {
  const showing = tooltipsShowing(ignoreSelectors);
  const described = tooltipsDescribing(trigger).find((tooltip) => showing.includes(tooltip));
  if (described) {
    return described;
  }
  const box = trigger.getBoundingClientRect();
  const [nearest] = showing
    .map((tooltip) => ({ tooltip, gap: gapBetween(box, tooltip.getBoundingClientRect()) }))
    .filter(({ gap }) => gap <= TOOLTIP_GAP)
    .sort((a, b) => a.gap - b.gap);
  return nearest?.tooltip ?? null;
};

const contains = ({ left, top, right, bottom }: Box, { x, y }: Point): boolean =>
  x >= left && x <= right && y >= top && y <= bottom;

/** The innermost element of `element` at `point`, going by their boxes. */
const innermostAt = (element: Element, point: Point): Element => {
  const child = Array.from(element.children)
    .reverse()
    .find((candidate) => contains(candidate.getBoundingClientRect(), point));
  return child ? innermostAt(child, point) : element;
};

export interface TooltipHit {
  tooltip: Element;
  /** The innermost element of the tooltip at the point. */
  hit: Element;
}

/** The page's tooltip showing at `point` (the last added, of several), and what of it is there. Hit-testing passes tooltips over: they are found by their boxes. */
export const tooltipAt = (
  point: Point,
  ignoreSelectors: readonly string[] = []
): TooltipHit | null => {
  const tooltip = tooltipsShowing(ignoreSelectors).find((candidate) =>
    contains(candidate.getBoundingClientRect(), point)
  );
  return tooltip ? { tooltip, hit: innermostAt(tooltip, point) } : null;
};

/** Whether the element takes input, leaving aside what may be drawn over it. */
const isEnabled = (element: Element): boolean =>
  isVisible(element) &&
  !matches(element, ':disabled') &&
  element.closest('[aria-disabled="true"], [inert]') === null;

const isExposedAtCenter = (element: Element): boolean => {
  const rect = element.getBoundingClientRect();
  return isExposed(element, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
};

/** Whether the element can be clicked right now. */
export const isActionable = (element: Element): boolean =>
  isEnabled(element) && isExposedAtCenter(element);

/** Whether the element could be clicked, were it not for other UI drawn over it. */
export const isCovered = (element: Element): boolean =>
  isEnabled(element) && !isExposedAtCenter(element);

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
  point?: Point;
  /** Innermost element under the pointer; recorded as the pin's target when it lies inside `element`. */
  hit?: Element;
}

const relativePosition = (
  rect: DOMRect,
  point?: Point
): Pick<ElementAnchor, 'relativeX' | 'relativeY'> => ({
  relativeX: point && rect.width > 0 ? clamp01((point.x - rect.left) / rect.width) : 0.5,
  relativeY: point && rect.height > 0 ? clamp01((point.y - rect.top) / rect.height) : 0.5,
});

const buildTarget = (element: Element, hit: Element, point?: Point): AnchorTarget | undefined => {
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
  } else if (matches(element, TOOLTIP_SELECTOR) && text && text.length <= NAME_MAX_LENGTH) {
    // Mounted anew in a portal each time it shows, a tooltip has no stable path: it is its text.
    addIfUnique({ type: 'text', tag: TOOLTIP_SELECTOR, value: text });
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

/** Whether the element is in the hint of one of the layer's own buttons: a tooltip, but not the page's. */
const isOfLayer = (element: Element): boolean => {
  const tooltip = element.closest(TOOLTIP_SELECTOR);
  const trigger = tooltip && triggerOf(tooltip);
  return trigger != null && isIgnored(trigger);
};

/**
 * The element an anchor points at: the first locator matching exactly one
 * visible element. A structural path may match one element whose content
 * changed (inexactly), but never picks among several, nor stands in for a
 * tooltip, one being found at another's path as easily as at its own.
 */
export const resolveAnchor = (anchor: ElementAnchor): ResolvedAnchor | null => {
  for (const locator of anchor.locators) {
    const found = queryLocator(locator).filter(
      (candidate) => isVisible(candidate) && !isOfLayer(candidate)
    );
    if (locator.type === 'cssPath') {
      const exactMatches = found.filter(
        (candidate) => fingerprintOf(candidate) === locator.fingerprint
      );
      if (exactMatches.length === 1) {
        return { element: exactMatches[0], exact: true };
      }
      if (exactMatches.length === 0 && found.length === 1 && !isInTooltip(found[0])) {
        return { element: found[0], exact: false };
      }
    } else if (found.length === 1) {
      return { element: found[0], exact: true };
    }
  }
  return null;
};

/** Viewport position of an anchor's pin: inside its target when that still resolves with the same content, otherwise proportional in the element. */
export const getAnchorPoint = (anchor: ElementAnchor, element: Element): Point => {
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

/** A resolved anchor as it is shown: where its pin goes, and whether the element shows there. */
export interface PlacedAnchor extends ResolvedAnchor {
  point: Point;
  /** The element is what shows at the pin (see `isExposed`); under a dialog, menu or bar, neither is in sight. */
  exposed: boolean;
}

/** With `exposed` given, the element is not hit-tested: for when the layer itself covers the page. */
export const placeAnchor = (
  anchor: ElementAnchor,
  resolved: ResolvedAnchor,
  { exposed }: { exposed?: boolean } = {}
): PlacedAnchor => {
  const point = getAnchorPoint(anchor, resolved.element);
  return { ...resolved, point, exposed: exposed ?? isExposed(resolved.element, point) };
};
