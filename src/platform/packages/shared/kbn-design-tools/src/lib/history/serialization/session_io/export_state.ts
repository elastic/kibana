/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
import type { ElementRegistry } from '../../../../edit_engine/element_registry';
import { toPath, buildRelativeSelector } from '../element_path';
import { DEVTOOL_HIDDEN_ATTR, DEVTOOL_LIBRARY_ID_ATTR } from '../../../constants';
import { readStateAttributes } from '../../../../components/edit/library/serializable_state';
import { getPageColorScheme } from '../../../dom/get_page_color_mode';
import type {
  ExportedState,
  ExportedSession,
  ExportedDeletion,
  SerializedStyleEditEntry,
  SerializedTextEditEntry,
  SerializedMediaEditEntry,
} from './types';

/**
 * Serialize the current registry state into a portable JSON object.
 *
 * For existing page elements (non-duplicates), stores an element path
 * so the element can be found on re-import. For inserted duplicates
 * (cloned or live EUI components), stores the outer HTML so the
 * element can be recreated from scratch.
 *
 * @param registry - The live element registry.
 * @returns A JSON-serializable payload.
 */
export const exportState = (registry: ElementRegistry): ExportedState => {
  const sessions: ExportedSession[] = [];

  for (const session of registry.values()) {
    const referenceElPath = session.referenceEl ? toPath(session.referenceEl) : undefined;

    const styleEdits: SerializedStyleEditEntry[] = session.styleEdits.map((e) => {
      const current = e.element.style.getPropertyValue(e.property);
      return {
        targetPath: toPath(e.element),
        relativeSelector: buildRelativeSelector(session.el, e.element),
        property: e.property,
        original: e.original,
        originalPriority: e.originalPriority,
        current,
        currentPriority: e.element.style.getPropertyPriority(e.property),
      };
    });

    const textEdits: SerializedTextEditEntry[] = session.textEdits.map((e) => {
      const parent = e.node.parentElement;
      const parentPath = parent ? toPath(parent) : toPath(session.el);
      const parentRelativeSelector = parent ? buildRelativeSelector(session.el, parent) : undefined;
      let childIndex = 0;
      if (parent) {
        for (let i = 0; i < parent.childNodes.length; i++) {
          if (parent.childNodes[i] === e.node) {
            childIndex = i;
            break;
          }
        }
      }
      return {
        parentPath,
        parentRelativeSelector,
        childIndex,
        original: e.original,
        current: e.node.textContent ?? '',
      };
    });

    const mediaEdits: SerializedMediaEditEntry[] = session.mediaEdits.map((e) => ({
      targetPath: toPath(e.element),
      relativeSelector: buildRelativeSelector(session.el, e.element),
      attribute: e.attribute,
      original: e.original,
      current: e.element.getAttribute(e.attribute) ?? '',
    }));

    // componentState (React hook snapshots for live elements)
    // is intentionally omitted. Hook values may contain
    // non-serializable data (DOM refs, callbacks). Interactive
    // components rely on stateAttributes for round-trip fidelity.
    const base: ExportedSession = {
      dx: session.dx,
      dy: session.dy,
      dw: session.dw,
      dh: session.dh,
      originalRect: {
        x: session.originalRect.x,
        y: session.originalRect.y,
        width: session.originalRect.width,
        height: session.originalRect.height,
      },
      isDuplicate: session.isDuplicate,
      referenceElPath,
      styleEdits,
      textEdits,
      mediaEdits,
      libraryId: session.el.getAttribute(DEVTOOL_LIBRARY_ID_ATTR) ?? undefined,
      stateAttributes: (() => {
        const attrs = readStateAttributes(session.el);
        return Object.keys(attrs).length > 0 ? attrs : undefined;
      })(),
    };

    if (session.isDuplicate) {
      sessions.push({
        ...base,
        outerHTML: session.el.outerHTML,
        inlineStyles: session.el.style.cssText,
      });
    } else {
      sessions.push({
        ...base,
        elPath: toPath(session.el),
      });
    }
  }

  // Collect soft-deleted elements: anything with DEVTOOL_HIDDEN_ATTR that
  // is not the hidden original of an active session (those are tracked via
  // the session's referenceEl instead).
  const activeReferenceEls = new Set<HTMLElement>();
  for (const session of registry.values()) {
    if (session.referenceEl) activeReferenceEls.add(session.referenceEl);
  }

  const deletions: ExportedDeletion[] = [];
  const hiddenEls = document.querySelectorAll<HTMLElement>(`[${DEVTOOL_HIDDEN_ATTR}]`);
  for (const el of hiddenEls) {
    if (activeReferenceEls.has(el)) continue;
    deletions.push({
      elPath: toPath(el),
      originalTransform: el.getAttribute(DEVTOOL_HIDDEN_ATTR) ?? '',
    });
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    pageUrl: window.location.href,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    scroll: (() => {
      const scrollEl = document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID);
      return scrollEl ? { x: scrollEl.scrollLeft, y: scrollEl.scrollTop } : { x: 0, y: 0 };
    })(),
    colorScheme: getPageColorScheme(),
    sessions,
    ...(deletions.length > 0 ? { deletions } : {}),
  };
};
