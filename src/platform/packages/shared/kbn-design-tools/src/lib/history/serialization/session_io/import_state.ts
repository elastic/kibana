/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
import { EUI_LIBRARY } from '../../../../components/edit/library/library_entries';
import type { ElementRegistry, ElementSession } from '../../../../edit_engine/element_registry';
import { fromPath } from '../element_path';
import type { ElementPath } from '../element_path';
import { buildTransform } from '../../../../edit_engine/resize_helpers';
import {
  unfreezeChildren,
  softHideElement,
  reflowManagedStyle,
  reflowManagedText,
  roundRect,
} from '../../../../edit_engine/clone_element';
import { cloneElement } from '../../../../edit_engine/clone_element';
import { hasNoWrapTextInChain } from '../../../../edit_engine/text_layout_helpers';
import { setImportant } from '../../../dom/set_important';
import {
  DEVTOOL_MANAGED_ATTR,
  DEVTOOL_LIBRARY_ID_ATTR,
  IMPORT_CLONE_Z_INDEX,
  MAX_TREE_DEPTH,
  PSEUDO_CLASS_PREFIX,
  PSEUDO_CLASS_RE,
} from '../../../constants';
import { renderEuiComponentLive } from '../../../../components/edit/library/insert_element';
import {
  replaceIconContent,
  applySourceAttribute,
} from '../../../../components/edit/library/eui_icon_cache';
import { getPageColorScheme } from '../../../dom/get_page_color_mode';
import { resolveColorTokensDeep } from '../../../dom/color_token_lookup';
import {
  buildEmotionClassMap,
  remapEmotionClasses,
} from '../../../../edit_engine/remap_emotion_classes';
import { sanitizeHTML, sanitizeInlineStyles } from './sanitize_html';
import type { ExportedState, ExportedSession, ImportResult } from './types';

/** Attributes allowed to be restored during media edit import. */
const ALLOWED_SOURCE_ATTRIBUTES: ReadonlySet<string> = new Set(['src', 'href', 'data-icon-type']);

/**
 * Resolve a serialized element path to an HTMLElement, pushing
 * warnings when the fingerprint doesn't match or the element
 * isn't found.
 */
const resolveElement = (
  path: ElementPath,
  label: string,
  warnings: string[]
): HTMLElement | null => {
  const result = fromPath(path);
  if (!result.element) {
    warnings.push(`Could not find ${label} (selector: ${path.selector}).`);
    return null;
  }
  if (!result.fingerprintMatch) {
    warnings.push(`${label} was found but its content has changed (selector: ${path.selector}).`);
  }
  return result.element instanceof HTMLElement ? result.element : null;
};

/**
 * Look up an EUI library entry by its serialized ID (e.g. "Switch/Regular" or "Button").
 * Returns the ReactElement, or null if not found.
 */
const findLibraryElement = (libraryId: string) => {
  const parts = libraryId.split('/');
  const entryLabel = parts[0];
  const variantLabel = parts[1];

  const entry = EUI_LIBRARY.find((e) => e.label === entryLabel);
  if (!entry) return null;

  if (variantLabel && entry.variants) {
    const variant = entry.variants.find((v) => v.label === variantLabel);
    if (variant) {
      return { element: variant.element };
    }
  }

  return { element: entry.element };
};

const recreateFromOuterHTML = (
  exported: ExportedSession,
  warnings: string[]
): HTMLElement | null => {
  if (!exported.outerHTML) {
    warnings.push('Duplicate session missing outerHTML. Skipping.');
    return null;
  }
  const cleanHTML = sanitizeHTML(exported.outerHTML);
  const doc = new DOMParser().parseFromString(cleanHTML, 'text/html');
  const recreated = doc.body.firstElementChild as HTMLElement | null;
  if (!recreated) {
    warnings.push('Could not recreate element from outerHTML. Skipping.');
    return null;
  }
  const adopted = document.adoptNode(recreated);
  if (exported.inlineStyles) {
    adopted.style.cssText = sanitizeInlineStyles(exported.inlineStyles);
  }
  adopted.style.pointerEvents = 'auto';
  document.body.appendChild(adopted);
  return adopted;
};

const stripPseudoStyles = (root: HTMLElement): void => {
  for (const style of root.querySelectorAll('style')) {
    const text = style.textContent ?? '';
    if (text.includes(PSEUDO_CLASS_PREFIX) && /\.__pseudo_[0-9a-f]+::(?:before|after)/.test(text)) {
      style.remove();
    }
  }
  const removeCls = (el: Element): void => {
    for (const cls of Array.from(el.classList)) {
      if (cls.startsWith(PSEUDO_CLASS_PREFIX) && PSEUDO_CLASS_RE.test(cls)) {
        el.classList.remove(cls);
      }
    }
  };
  removeCls(root);
  for (const el of root.querySelectorAll('*')) {
    removeCls(el);
  }
};

const applyIconOverrides = (outerHTML: string | undefined, liveEl: HTMLElement): void => {
  if (!outerHTML) return;
  const doc = new DOMParser().parseFromString(outerHTML, 'text/html');
  const savedIcons = doc.querySelectorAll('[data-icon-type]');
  if (savedIcons.length === 0) return;

  const liveSvgs = liveEl.querySelectorAll('svg');
  const savedSvgList = Array.from(doc.querySelectorAll('svg'));
  const svgIndexMap = new Map(savedSvgList.map((svg, i) => [svg, i]));

  for (const savedIcon of savedIcons) {
    const savedType = savedIcon.getAttribute('data-icon-type');
    if (!savedType) continue;
    const savedIndex = svgIndexMap.get(savedIcon as SVGSVGElement) ?? -1;
    if (savedIndex < 0 || savedIndex >= liveSvgs.length) continue;
    replaceIconContent(liveSvgs[savedIndex], savedType);
  }
};

/**
 * Import a serialized state payload into the registry, re-applying
 * all position transforms and re-registering edit records.
 *
 * Elements are located on the current page via their serialized paths.
 * If a path can't be resolved the session is skipped and counted as
 * failed.
 *
 * @param state - The parsed JSON export.
 * @param registry - The live element registry to populate.
 * @returns A summary of restored/failed sessions and warnings.
 */
export const importState = async (
  state: ExportedState,
  registry: ElementRegistry
): Promise<ImportResult> => {
  const warnings: string[] = [];
  let restoredCount = 0;
  let failedCount = 0;
  let colorModeMismatch = false;
  const importedElements: HTMLElement[] = [];

  // Compute scroll delta between export and import. Duplicate elements
  // (library inserts, outerHTML clones) have no in-flow reference, so
  // their exported viewport positions must be shifted by the scroll
  // difference. Non-duplicate re-clones are positioned by cloneElement
  // from the reference element's current BCR, which already reflects
  // the current scroll — useScrollSync then keeps them in sync.
  const scrollEl = document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID);
  const currentScroll = scrollEl
    ? { x: scrollEl.scrollLeft, y: scrollEl.scrollTop }
    : { x: 0, y: 0 };
  const exportScroll = state.scroll ?? { x: 0, y: 0 };
  const scrollDx = currentScroll.x - exportScroll.x;
  const scrollDy = currentScroll.y - exportScroll.y;

  if (state.viewport) {
    const { width, height } = state.viewport;
    if (width !== window.innerWidth || height !== window.innerHeight) {
      warnings.push(
        `Viewport mismatch: exported at ${width}×${height}, current is ${window.innerWidth}×${window.innerHeight}. Elements may appear misaligned.`
      );
    }
  }

  let emotionMap: ReadonlyMap<string, string> | null = null;

  if (state.colorScheme) {
    const current = getPageColorScheme();
    if (state.colorScheme.colorMode !== current.colorMode) {
      colorModeMismatch = true;
      // Emotion class hashes change between color modes. Build a map
      // from label suffix → current-mode class so we can remap stale
      // class names from the export.
      emotionMap = buildEmotionClassMap();
    }
    if (state.colorScheme.forcedColors !== current.forcedColors) {
      warnings.push(
        state.colorScheme.forcedColors
          ? 'Export was created with high-contrast (forced-colors) mode active, but it is not active now. Colors may differ.'
          : 'High-contrast (forced-colors) mode is active but was not when the export was created. Colors may differ.'
      );
    }
  }

  for (const exported of state.sessions) {
    try {
      let el: HTMLElement;
      let liveReactElement: { element: ReactElement; zIndex: number } | undefined;
      let cleanup: (() => void) | undefined;
      let cloneRect: DOMRect | undefined;

      // For duplicates (library inserts / outerHTML clones), shift the
      // exported viewport position by the scroll delta. For non-duplicate
      // re-clones, cloneElement positions from the reference's current
      // BCR which already accounts for scroll — no adjustment needed.
      const scrollAdjustedRect = exported.isDuplicate
        ? roundRect(
            new DOMRect(
              exported.originalRect.x - scrollDx,
              exported.originalRect.y - scrollDy,
              exported.originalRect.width,
              exported.originalRect.height
            )
          )
        : null;

      if (exported.isDuplicate) {
        const libraryMatch = exported.libraryId ? findLibraryElement(exported.libraryId) : null;

        if (libraryMatch) {
          try {
            const live = await renderEuiComponentLive(
              libraryMatch.element,
              IMPORT_CLONE_Z_INDEX,
              exported.stateAttributes
            );
            el = live.wrapper;
            liveReactElement = live.liveReactElement;
            cleanup = live.cleanup;
            setImportant(el, 'left', `${scrollAdjustedRect!.left}px`);
            setImportant(el, 'top', `${scrollAdjustedRect!.top}px`);
            el.style.pointerEvents = 'auto';
            if (exported.libraryId) {
              el.setAttribute(DEVTOOL_LIBRARY_ID_ATTR, exported.libraryId);
            }
            applyIconOverrides(exported.outerHTML, el);
          } catch {
            warnings.push(
              `Fresh render failed for ${exported.libraryId}. Falling back to outerHTML.`
            );
            const fallback = recreateFromOuterHTML(exported, warnings);
            if (!fallback) {
              failedCount++;
              continue;
            }
            setImportant(fallback, 'left', `${scrollAdjustedRect!.left}px`);
            setImportant(fallback, 'top', `${scrollAdjustedRect!.top}px`);
            el = fallback;
          }
        } else {
          if (!exported.outerHTML) {
            warnings.push('Duplicate session missing outerHTML. Skipping.');
            failedCount++;
            continue;
          }
          const recreated = recreateFromOuterHTML(exported, warnings);
          if (!recreated) {
            failedCount++;
            continue;
          }
          setImportant(recreated, 'left', `${scrollAdjustedRect!.left}px`);
          setImportant(recreated, 'top', `${scrollAdjustedRect!.top}px`);
          el = recreated;
        }
      } else {
        if (!exported.elPath) {
          warnings.push('Non-duplicate session missing elPath. Skipping.');
          failedCount++;
          continue;
        }
        const elResult = fromPath(exported.elPath);
        const elResolved = elResult.element instanceof HTMLElement ? elResult.element : null;

        if (
          elResolved &&
          !registry.has(elResolved) &&
          (elResult.fingerprintMatch || !exported.referenceElPath)
        ) {
          if (!elResult.fingerprintMatch) {
            warnings.push(
              `session element was found but its content has changed (selector: ${exported.elPath.selector}).`
            );
          }
          el = elResolved;
        } else if (exported.referenceElPath) {
          // The clone was removed (e.g. by resetAll). Re-create it from
          // the original in-flow element found via referenceElPath.
          const original = resolveElement(
            exported.referenceElPath,
            'original element for re-clone',
            warnings
          );
          if (!original) {
            failedCount++;
            continue;
          }
          const cloneResult = cloneElement(original, IMPORT_CLONE_Z_INDEX);
          const clone = cloneResult.clone;
          cloneRect = cloneResult.rect;
          clone.style.pointerEvents = 'auto';

          setImportant(clone, 'width', `${exported.originalRect.width}px`);
          setImportant(clone, 'height', `${exported.originalRect.height}px`);

          // The fresh clone has all children's dimensions frozen by
          // copyStylesDeep at the original's full size. Only unfreeze
          // properties that were actually edited so other frozen
          // dimensions remain intact.
          const editedProps = new Set(
            exported.styleEdits.filter((e) => e.relativeSelector === '').map((e) => e.property)
          );
          if (editedProps.has('width')) {
            unfreezeChildren(clone, 'width');
          }
          if (editedProps.has('height')) {
            unfreezeChildren(clone, 'height');
          }

          // Hide the original so there's no visual duplication,
          // same as the drag system does. Preserve the original's
          // current transform so resetAll can restore it.
          softHideElement(original);

          document.body.appendChild(clone);
          el = clone;
        } else {
          failedCount++;
          continue;
        }
      }

      const referenceEl = exported.referenceElPath
        ? resolveElement(exported.referenceElPath, 'reference element', warnings) ?? undefined
        : undefined;

      // When the color mode differs, remap stale Emotion class names
      // so CSS rules from the current mode apply correctly.
      if (emotionMap) {
        remapEmotionClasses(el, emotionMap);
        // The remapped Emotion classes provide correct ::before/::after
        // rules for the current color mode. Strip the captured pseudo-
        // element <style> tags and their class names so they don't
        // override the Emotion rules with stale structural properties
        // (e.g. border-style: solid when the current mode uses none).
        stripPseudoStyles(el);
      }

      // Refresh var(--dt-*) fallback hex values in inline styles so
      // colors match the current color mode.
      resolveColorTokensDeep(el);

      // For edits, try to resolve the original target. If that fails (e.g.
      // the old clone was removed), fall back to the newly created element.
      // This handles both cases: importing onto an existing clone, and
      // re-cloning from the original after a reset.
      const resolveEditElement = (
        path: ElementPath,
        label: string,
        relativeSelector?: string
      ): HTMLElement | null => {
        if (relativeSelector !== undefined) {
          const target =
            relativeSelector === ''
              ? el
              : (el.querySelector(relativeSelector) as HTMLElement | null);
          if (target) return target;
        }
        const resolved = resolveElement(path, label, []);
        return resolved ?? (el instanceof HTMLElement ? el : null);
      };

      const styleEdits = exported.styleEdits
        .map((e) => {
          const element = resolveEditElement(
            e.targetPath,
            `style edit (${e.property})`,
            e.relativeSelector
          );
          if (!element) return null;
          element.style.setProperty(e.property, e.current, e.currentPriority);
          reflowManagedStyle(element, e.property);
          return {
            element,
            property: e.property,
            original: e.original,
            originalPriority: e.originalPriority,
          };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);

      const replayedTextParents = new Set<HTMLElement>();
      const textEdits = exported.textEdits
        .map((e) => {
          const parent = resolveEditElement(
            e.parentPath,
            'text edit parent',
            e.parentRelativeSelector
          );
          if (!parent) return null;
          replayedTextParents.add(parent);
          const node = parent.childNodes[e.childIndex];
          if (!node || node.nodeType !== Node.TEXT_NODE) return null;
          // Re-apply the current text content.
          if (e.current !== undefined) {
            node.textContent = e.current;
            reflowManagedText(parent);
          }
          return { node: node as Text, original: e.original };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);

      // Keep import behavior consistent with runtime text reflow.
      // In no-wrap text contexts, root width is intentionally unfrozen so
      // text can grow horizontally (e.g. badges). Avoid force-freezing it.
      const shouldKeepRootWidthAuto = Array.from(replayedTextParents).some((parent) =>
        hasNoWrapTextInChain(parent, el, MAX_TREE_DEPTH)
      );
      const rootWidthReleasedByStyleEdit = exported.styleEdits.some(
        (e) => e.relativeSelector === '' && e.property === 'width' && e.current === ''
      );
      const keepRootWidthAuto = shouldKeepRootWidthAuto || rootWidthReleasedByStyleEdit;
      const shouldKeepRootHeightAuto =
        el.hasAttribute(DEVTOOL_MANAGED_ATTR) && replayedTextParents.size > 0;
      const rootHeightReleasedByStyleEdit = exported.styleEdits.some(
        (e) => e.relativeSelector === '' && e.property === 'height' && e.current === ''
      );
      const keepRootHeightAuto = shouldKeepRootHeightAuto || rootHeightReleasedByStyleEdit;

      const mediaEdits = exported.mediaEdits
        .map((e) => {
          if (!ALLOWED_SOURCE_ATTRIBUTES.has(e.attribute)) return null;
          const element = resolveEditElement(
            e.targetPath,
            `media edit (${e.attribute})`,
            e.relativeSelector
          );
          if (!element) return null;
          // Re-apply the current attribute value.
          if (e.current !== undefined) {
            applySourceAttribute(element, e.attribute, e.current);
          }
          return { element, attribute: e.attribute, original: e.original };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);

      // For duplicates, use the scroll-adjusted position. For re-clones,
      // use the position from cloneElement (reflects reference element's
      // current BCR). For existing elements, use their current parsed position.
      let rectLeft: number;
      let rectTop: number;
      if (scrollAdjustedRect) {
        rectLeft = scrollAdjustedRect.left;
        rectTop = scrollAdjustedRect.top;
      } else if (cloneRect) {
        rectLeft = cloneRect.left;
        rectTop = cloneRect.top;
      } else {
        rectLeft = parseFloat(el.style.left) || exported.originalRect.x;
        rectTop = parseFloat(el.style.top) || exported.originalRect.y;
      }
      const originalRect = new DOMRect(
        rectLeft,
        rectTop,
        exported.originalRect.width,
        exported.originalRect.height
      );

      const session: ElementSession = {
        el,
        dx: exported.dx,
        dy: exported.dy,
        dw: exported.dw,
        dh: exported.dh,
        originalRect,
        isDuplicate: exported.isDuplicate,
        referenceEl,
        liveReactElement,
        styleEdits,
        textEdits,
        mediaEdits,
        cleanup,
      };

      registry.set(session);

      // Style-edit reflow may strip the root's frozen width/height
      // (unfreezeAncestors walks up from the edited child). Re-apply
      // the root dimensions so the managed element keeps its size.
      const finalW = exported.originalRect.width + exported.dw;
      const finalH = exported.originalRect.height + exported.dh;
      if (!keepRootWidthAuto) {
        setImportant(el, 'width', `${finalW}px`);
      }
      if (!keepRootHeightAuto) {
        setImportant(el, 'height', `${finalH}px`);
      }

      // Re-apply the CSS transform so the element visually moves.
      // transform-origin must be 0 0 so scale pivots from the top-left
      // corner, matching what drag/duplicate/resize set at runtime.
      el.style.transformOrigin = '0 0';
      const hasZeroDimension = originalRect.width === 0 || originalRect.height === 0;
      const scaleX = hasZeroDimension ? 1 : (originalRect.width + exported.dw) / originalRect.width;
      const scaleY = hasZeroDimension
        ? 1
        : (originalRect.height + exported.dh) / originalRect.height;
      setImportant(el, 'transform', buildTransform(exported.dx, exported.dy, scaleX, scaleY));

      importedElements.push(el);
      restoredCount++;
    } catch (e) {
      warnings.push(`Failed to import session: ${e instanceof Error ? e.message : String(e)}`);
      failedCount++;
    }
  }

  // Re-apply soft-deletions: hide elements that were deleted before export.
  let deletedCount = 0;
  const importedDeletions: Array<{ element: HTMLElement; originalTransform: string }> = [];
  if (state.deletions) {
    for (const deletion of state.deletions) {
      const el = resolveElement(deletion.elPath, 'deleted element', warnings);
      if (!el) continue;
      softHideElement(el, deletion.originalTransform);
      importedDeletions.push({ element: el, originalTransform: deletion.originalTransform });
      deletedCount++;
    }
  }

  return {
    restoredCount,
    deletedCount,
    warnings,
    failedCount,
    colorSchemeMismatch: colorModeMismatch,
    importedElements,
    importedDeletions,
  };
};
