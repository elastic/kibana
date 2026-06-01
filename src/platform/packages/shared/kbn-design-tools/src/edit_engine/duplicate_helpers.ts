/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DUPLICATE_OFFSET, DEVTOOL_LIBRARY_ID_ATTR } from '../lib/constants';
import { cloneClean, roundRect } from './clone_element';
import { setImportant } from '../lib/dom/set_important';
import type { ElementSession, ElementRegistry, MediaEdit } from './element_registry';
import { buildTransform } from './resize_helpers';
import { renderEuiComponentLive } from '../components/edit/library/insert_element';
import { applySourceAttribute } from '../components/edit/library/eui_icon_cache';
import { readStateAttributes } from '../components/edit/library/serializable_state';

/**
 * Replay media edits (e.g. icon replacements) from a source element tree
 * onto a freshly created duplicate. Matches elements by structural
 * fingerprint so the correct target is updated.
 *
 * Returns new {@link MediaEdit} entries mapped to the target elements so
 * the duplicate's session can carry the edits forward to further duplicates.
 */
const transferMediaEdits = (
  mediaEdits: MediaEdit[],
  source: HTMLElement,
  target: HTMLElement
): MediaEdit[] => {
  if (mediaEdits.length === 0) return [];

  const transferred: MediaEdit[] = [];

  // Build fingerprint maps for both trees (including roots)
  const allSource = [source, ...source.querySelectorAll<Element>('*')];
  const allTarget = [target, ...target.querySelectorAll<Element>('*')];

  const sourceFingerprints = new Map<Element, string>();
  for (const el of allSource) {
    sourceFingerprints.set(el, buildTreeFingerprint(el));
  }

  const targetByFingerprint = new Map<string, Element[]>();
  for (const el of allTarget) {
    const key = buildTreeFingerprint(el);
    const list = targetByFingerprint.get(key);
    if (list) {
      list.push(el);
    } else {
      targetByFingerprint.set(key, [el]);
    }
  }

  // For each media edit, find the matching target element
  // Build source element order for consistent indexing
  const sourceIndexByFingerprint = new Map<Element, number>();
  const sourceCountByFingerprint = new Map<string, number>();
  for (const el of allSource) {
    const key = sourceFingerprints.get(el)!;
    const count = sourceCountByFingerprint.get(key) ?? 0;
    sourceIndexByFingerprint.set(el, count);
    sourceCountByFingerprint.set(key, count + 1);
  }

  for (const edit of mediaEdits) {
    const key = sourceFingerprints.get(edit.element);
    if (!key) continue;

    // Find the index of this element among same-fingerprint siblings in source
    const sourceIdx = sourceIndexByFingerprint.get(edit.element) ?? -1;
    if (sourceIdx < 0) continue;

    const targetSiblings = targetByFingerprint.get(key);
    const hasNoMatchingTarget = !targetSiblings || sourceIdx >= targetSiblings.length;
    if (hasNoMatchingTarget) continue;

    const targetEl = targetSiblings[sourceIdx];
    const currentValue = edit.element.getAttribute(edit.attribute) ?? '';

    applySourceAttribute(targetEl, edit.attribute, currentValue);

    transferred.push({
      element: targetEl,
      attribute: edit.attribute,
      original: edit.original,
    });
  }

  return transferred;
};

/**
 * Build a structural fingerprint for matching elements across two structurally
 * similar DOM trees. Uses tag name, stable class names, and position among
 * same-tag siblings - more resilient than flat index when React re-renders
 * change child counts (e.g. toggling a switch).
 *
 * Emotion class names (`css-{hash}-{label}`) have their volatile hash
 * stripped so that re-renders with different Emotion hashes still produce
 * the same fingerprint.
 */
const EMOTION_HASH_RE = /\bcss-[a-z0-9]+-/g;

const buildTreeFingerprint = (el: Element): string => {
  const parent = el.parentElement;
  let positionIndex = 0;
  if (parent) {
    for (const child of parent.children) {
      if (child === el) break;
      if (child.tagName === el.tagName) positionIndex++;
    }
  }
  const stableClass =
    typeof el.className === 'string' ? el.className.replace(EMOTION_HASH_RE, 'css-') : '';
  return `${el.tagName}|${stableClass}|${positionIndex}`;
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
    const key = buildTreeFingerprint(tgt);
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
    const isUnmodified = src.style.length === 0 && !hasDirectTextContent(src);
    if (isUnmodified) continue;

    const key = buildTreeFingerprint(src);
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
 * Check whether an element has any direct text node children with
 * non-empty content. Used to identify elements that *may* carry
 * user-modified text - the actual modification check happens in
 * `transferDomEdits` by comparing source and target text.
 */
const hasDirectTextContent = (el: HTMLElement): boolean => {
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && child.nodeValue?.trim()) return true;
  }
  return false;
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
  let transferredMediaEdits: MediaEdit[] = [];

  if (liveInfo) {
    // Read serialized state from the source's DOM attributes and pass it
    // as initialState so the duplicate renders with the same state.
    const initialState = readStateAttributes(sourceEl);
    const hasState = Object.keys(initialState).length > 0;

    const live = await renderEuiComponentLive(
      liveInfo.element,
      liveInfo.zIndex,
      hasState ? initialState : undefined
    );
    duplicate = live.wrapper;
    rect = live.rect;
    cleanup = live.cleanup;
    duplicate.style.transformOrigin = '0 0';
    transferDomEdits(sourceEl, duplicate);

    // Replay media edits (icon changes, etc.) from the source session.
    if (existingSession?.mediaEdits.length) {
      transferredMediaEdits = transferMediaEdits(existingSession.mediaEdits, sourceEl, duplicate);
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

  const sourceLibraryId = sourceEl.getAttribute(DEVTOOL_LIBRARY_ID_ATTR);
  if (sourceLibraryId) {
    duplicate.setAttribute(DEVTOOL_LIBRARY_ID_ATTR, sourceLibraryId);
  }

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
    styleEdits: [],
    textEdits: [],
    mediaEdits: transferredMediaEdits,
    cleanup,
  };
  registry.set(session);

  return duplicate;
};
