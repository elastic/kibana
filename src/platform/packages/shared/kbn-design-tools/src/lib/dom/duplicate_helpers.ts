/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DUPLICATE_OFFSET } from '../constants';
import { cloneClean, setImportant, roundRect } from './clone_element';
import type { ElementSession, ElementRegistry, SourceEdit } from './element_registry';
import { buildTransform } from './resize_helpers';
import { renderEuiComponentLive } from './insert_element';
import { replaceIconContent } from '../eui_icon_cache';

/**
 * Replay source edits (e.g. icon replacements) from a source element tree
 * onto a freshly created duplicate. Matches elements by structural
 * fingerprint so the correct target is updated.
 */
const transferSourceEdits = (
  sourceEdits: SourceEdit[],
  source: HTMLElement,
  target: HTMLElement
): void => {
  if (sourceEdits.length === 0) return;

  // Build fingerprint maps for both trees (including roots)
  const allSource = [source, ...source.querySelectorAll<Element>('*')];
  const allTarget = [target, ...target.querySelectorAll<Element>('*')];

  const sourceFingerprints = new Map<Element, string>();
  for (const el of allSource) {
    sourceFingerprints.set(el, buildFingerprint(el));
  }

  const targetByFingerprint = new Map<string, Element[]>();
  for (const el of allTarget) {
    const key = buildFingerprint(el);
    const list = targetByFingerprint.get(key);
    if (list) {
      list.push(el);
    } else {
      targetByFingerprint.set(key, [el]);
    }
  }

  // For each source edit, find the matching target element
  // Build source element order for consistent indexing
  const sourceByFingerprint = new Map<string, Element[]>();
  for (const el of allSource) {
    const key = sourceFingerprints.get(el)!;
    const list = sourceByFingerprint.get(key);
    if (list) {
      list.push(el);
    } else {
      sourceByFingerprint.set(key, [el]);
    }
  }

  for (const edit of sourceEdits) {
    const key = sourceFingerprints.get(edit.element);
    if (!key) continue;

    // Find the index of this element among same-fingerprint siblings in source
    const sourceSiblings = sourceByFingerprint.get(key);
    const sourceIdx = sourceSiblings?.indexOf(edit.element) ?? -1;
    if (sourceIdx < 0) continue;

    const targetSiblings = targetByFingerprint.get(key);
    if (!targetSiblings || sourceIdx >= targetSiblings.length) continue;

    const targetEl = targetSiblings[sourceIdx];
    const currentValue = edit.element.getAttribute(edit.attribute) ?? '';

    if (edit.attribute === 'data-icon-type') {
      replaceIconContent(targetEl, currentValue);
    } else {
      targetEl.setAttribute(edit.attribute, currentValue);
    }
  }
};

/**
 * Build a structural fingerprint for matching elements across two structurally
 * similar DOM trees. Uses tag name, className, and position among same-tag
 * siblings — more resilient than flat index when React re-renders change
 * child counts (e.g. toggling a switch).
 */
const buildFingerprint = (el: Element): string => {
  const parent = el.parentElement;
  let positionIndex = 0;
  if (parent) {
    for (const child of parent.children) {
      if (child === el) break;
      if (child.tagName === el.tagName) positionIndex++;
    }
  }
  return `${el.tagName}|${el.className}|${positionIndex}`;
};

/**
 * Transfer user edits (inline style overrides and text content changes)
 * from a source element tree to a freshly rendered live duplicate.
 *
 * Matches elements by structural fingerprint (tag + className + position)
 * rather than flat index, so that minor React re-render differences
 * (e.g. switch checked/unchecked) don't misalign the transfer.
 */
const transferDomEdits = (source: HTMLElement, target: HTMLElement): void => {
  // Build a lookup from fingerprints to target elements
  const targetEls = target.querySelectorAll<HTMLElement>('*');
  const targetMap = new Map<string, HTMLElement[]>();
  for (const tgt of targetEls) {
    const key = buildFingerprint(tgt);
    const list = targetMap.get(key);
    if (list) {
      list.push(tgt);
    } else {
      targetMap.set(key, [tgt]);
    }
  }

  // Track how many times each fingerprint has been consumed
  const consumed = new Map<string, number>();

  const sourceEls = source.querySelectorAll<HTMLElement>('*');
  for (const src of sourceEls) {
    if (src.style.length === 0 && !hasModifiedTextNodes(src)) continue;

    const key = buildFingerprint(src);
    const targets = targetMap.get(key);
    if (!targets) continue;

    const idx = consumed.get(key) ?? 0;
    if (idx >= targets.length) continue;
    consumed.set(key, idx + 1);

    const tgt = targets[idx];

    // Copy inline style overrides
    for (let j = 0; j < src.style.length; j++) {
      const prop = src.style[j];
      tgt.style.setProperty(
        prop,
        src.style.getPropertyValue(prop),
        src.style.getPropertyPriority(prop)
      );
    }

    // Copy text node changes
    for (let j = 0; j < src.childNodes.length && j < tgt.childNodes.length; j++) {
      const srcNode = src.childNodes[j];
      const tgtNode = tgt.childNodes[j];
      if (srcNode.nodeType === Node.TEXT_NODE && tgtNode.nodeType === Node.TEXT_NODE) {
        if (srcNode.textContent !== tgtNode.textContent) {
          tgtNode.textContent = srcNode.textContent;
        }
      }
    }
  }
};

/**
 * Check whether an element has any direct text node children that could
 * have been user-modified (non-empty text content).
 */
const hasModifiedTextNodes = (el: HTMLElement): boolean => {
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && child.nodeValue?.trim()) return true;
  }
  return false;
};

/**
 * Get the committed React Fiber root from a createRoot container element.
 * React attaches `__reactContainer$<hash>` to the container. Due to
 * double-buffering the stored fiber may be the pre-commit tree; the
 * committed tree with actual components lives on `alternate` in that case.
 */
const getRootFiber = (el: Element): Record<string, unknown> | null => {
  const props = Object.keys(el);
  const containerKey = props.find((k) => k.startsWith('__reactContainer$'));
  if (containerKey) {
    const fiber = (el as unknown as Record<string, unknown>)[containerKey] as Record<
      string,
      unknown
    >;
    // Return whichever side has children (the committed tree)
    if (!fiber.child && fiber.alternate) {
      return fiber.alternate as Record<string, unknown>;
    }
    return fiber;
  }
  return null;
};

/**
 * DFS-collect all function component fibers with hooks from a fiber tree.
 * Tag 0 = FunctionComponent, 11 = ForwardRef, 15 = SimpleMemoComponent.
 */
const collectComponentFibers = (root: Record<string, unknown>): Array<Record<string, unknown>> => {
  const result: Array<Record<string, unknown>> = [];
  const walk = (node: Record<string, unknown> | null) => {
    if (!node) return;
    const tag = node.tag as number;
    if ((tag === 0 || tag === 11 || tag === 15) && node.memoizedState) {
      result.push(node);
    }
    walk(node.child as Record<string, unknown> | null);
    walk(node.sibling as Record<string, unknown> | null);
  };
  walk(root);
  return result;
};

/**
 * Read all useState/useReducer values from a fiber's hook linked list.
 * Returns just the values — a simple serializable array.
 */
const readHookValues = (fiber: Record<string, unknown>): unknown[] => {
  const values: unknown[] = [];
  let hook = fiber.memoizedState as Record<string, unknown> | null;
  while (hook) {
    const queue = hook.queue as { dispatch?: unknown } | null;
    if (queue && typeof queue.dispatch === 'function') {
      values.push(hook.memoizedState);
    }
    hook = hook.next as Record<string, unknown> | null;
  }
  return values;
};

/**
 * Snapshot the React hook state of every function component inside a live
 * element's fiber tree. Returns a simple `unknown[][]` — one array of
 * hook values per component, ordered by DFS position.
 *
 * Store the result on `ElementSession.componentState` so it survives
 * across duplicates without needing to re-read fibers.
 */
export const snapshotComponentState = (el: HTMLElement): unknown[][] | undefined => {
  try {
    const root = getRootFiber(el);
    if (!root) return undefined;
    const fibers = collectComponentFibers(root);
    if (fibers.length === 0) return undefined;
    return fibers.map(readHookValues);
  } catch {
    // React fiber internals are undocumented and may change across versions.
    // Gracefully degrade — duplicates will still work without state transfer.
    return undefined;
  }
};

/**
 * Restore a previously-snapshotted component state onto a freshly rendered
 * live element. Dispatches differ values into the target's hook setters
 * inside `flushSync`, with CSS transitions suppressed so there's no
 * visible animation (the duplicate should appear already in the right state).
 */
export const restoreComponentState = async (
  el: HTMLElement,
  snapshot: unknown[][]
): Promise<void> => {
  let root: Record<string, unknown> | null;
  let fibers: Array<Record<string, unknown>>;
  try {
    root = getRootFiber(el);
    if (!root) return;
    fibers = collectComponentFibers(root);
  } catch {
    // React fiber internals are undocumented and may change across versions.
    // Gracefully degrade — the duplicate will render with default state.
    return;
  }

  const updates: Array<{ dispatch: (v: unknown) => void; value: unknown }> = [];

  for (let i = 0; i < snapshot.length && i < fibers.length; i++) {
    const values = snapshot[i];
    const hookValues = readHookValues(fibers[i]);

    // Walk the hook list again to find dispatchers
    try {
      let hook = fibers[i].memoizedState as Record<string, unknown> | null;
      let j = 0;
      while (hook && j < values.length) {
        const queue = hook.queue as { dispatch: (v: unknown) => void } | null;
        if (queue && typeof queue.dispatch === 'function') {
          if (j < hookValues.length && values[j] !== hookValues[j]) {
            updates.push({ dispatch: queue.dispatch, value: values[j] });
          }
          j++;
        }
        hook = hook.next as Record<string, unknown> | null;
      }
    } catch {
      // Skip this fiber — its structure may not match expectations.
      continue;
    }
  }

  if (updates.length === 0) return;

  // Suppress transitions on the target tree only so the state change
  // appears instant without affecting the rest of the page.
  const descendants = el.querySelectorAll<HTMLElement>('*');
  const saved: Array<{ el: HTMLElement; t: string; a: string }> = [];
  for (const d of [el, ...descendants]) {
    saved.push({
      el: d,
      t: d.style.transition,
      a: d.style.animation,
    });
    setImportant(d, 'transition', 'none');
    setImportant(d, 'animation', 'none');
  }

  const { flushSync } = await import('react-dom');
  flushSync(() => {
    for (const { dispatch, value } of updates) {
      dispatch(value);
    }
  });

  // Force a reflow so the browser commits the no-transition frame,
  // then restore original values.
  void el.offsetHeight;
  for (const s of saved) {
    if (s.t) {
      s.el.style.transition = s.t;
    } else {
      s.el.style.removeProperty('transition');
    }
    if (s.a) {
      s.el.style.animation = s.a;
    } else {
      s.el.style.removeProperty('animation');
    }
  }
};

/**
 * Create a duplicate of the hovered element and register it in the registry.
 * Returns the new element so the caller can update hover state.
 */
export const createDuplicate = async (
  hoverTarget: HTMLElement,
  registry: ElementRegistry,
  cloneZIndex: number
): Promise<HTMLElement> => {
  const existingSession = registry.get(hoverTarget);
  const sourceEl = existingSession ? existingSession.el : hoverTarget;

  const sourceDw = existingSession?.dw ?? 0;
  const sourceDh = existingSession?.dh ?? 0;

  const liveInfo = existingSession?.liveReactElement;

  let duplicate: HTMLElement;
  let rect: DOMRect;
  let cleanup: (() => void) | undefined;

  if (liveInfo) {
    // Snapshot the source's React state before rendering the duplicate.
    const stateSnapshot = existingSession?.componentState ?? snapshotComponentState(sourceEl);

    // Create a fresh live instance for interactivity, then transfer any
    // user edits (inline style overrides, text changes) from the source.
    const live = await renderEuiComponentLive(liveInfo.element, liveInfo.zIndex);
    duplicate = live.wrapper;
    rect = live.rect;
    cleanup = live.cleanup;
    duplicate.style.transformOrigin = '0 0';
    transferDomEdits(sourceEl, duplicate);

    // Replay source edits (icon changes, etc.) from the source session.
    if (existingSession?.sourceEdits.length) {
      transferSourceEdits(existingSession.sourceEdits, sourceEl, duplicate);
    }

    // Restore the snapshotted state (with transitions suppressed).
    // Wrapped in try/catch because this touches React fiber internals
    // which may change across React versions.
    if (stateSnapshot) {
      try {
        await restoreComponentState(duplicate, stateSnapshot);
        // Re-measure after state restore — the element's dimensions may have
        // changed (e.g. an accordion that expanded).
        const rendered = duplicate.firstElementChild as HTMLElement | null;
        if (rendered) {
          rect = rendered.getBoundingClientRect();
        }
      } catch {
        // State restore failed — the duplicate will use default state.
      }
    }
  } else {
    const cloned = cloneClean(sourceEl, cloneZIndex);
    duplicate = cloned.clone;
    rect = cloned.rect;
    duplicate.style.transformOrigin = '0 0';
    duplicate.style.pointerEvents = 'auto';
    document.body.appendChild(duplicate);
  }

  // When duplicating a managed clone the visual position (sourceRect)
  // differs from the untransformed position (rect) returned by cloneClean
  // because cloneClean strips the transform before measuring.  Position
  // the duplicate at the visual location and use a corrected rect so
  // session.originalRect matches the actual left/top we set.
  const sourceRect = roundRect(sourceEl.getBoundingClientRect());
  // Position the duplicate at the rounded visual location.
  setImportant(duplicate, 'left', `${sourceRect.left}px`);
  setImportant(duplicate, 'top', `${sourceRect.top}px`);

  const correctedRect = new DOMRect(sourceRect.left, sourceRect.top, rect.width, rect.height);

  const scaleX = (rect.width + sourceDw) / rect.width;
  const scaleY = (rect.height + sourceDh) / rect.height;
  const initialTransform = buildTransform(DUPLICATE_OFFSET, DUPLICATE_OFFSET, scaleX, scaleY);
  setImportant(duplicate, 'transform', initialTransform);

  const session: ElementSession = {
    el: duplicate,
    dx: DUPLICATE_OFFSET,
    dy: DUPLICATE_OFFSET,
    dw: sourceDw,
    dh: sourceDh,
    originalRect: correctedRect,
    isDuplicate: true,
    // Live elements (inserted without a page reference) should keep
    // referenceEl undefined so useScrollSync treats them as free-floating.
    // Static clones need referenceEl for scroll tracking.
    referenceEl: liveInfo
      ? existingSession?.referenceEl
      : existingSession?.referenceEl ?? hoverTarget,
    liveReactElement: liveInfo,
    componentState: liveInfo ? snapshotComponentState(duplicate) : undefined,
    styleEdits: [],
    textEdits: [],
    sourceEdits: [],
    cleanup,
  };
  registry.set(session);

  return duplicate;
};
