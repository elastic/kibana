/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon } from '@elastic/eui';
import type { ComponentType } from 'react';
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

const lazyIconTypes = { names: undefined as string[] | undefined };

/**
 * Return all EUI icon type names. Derived at runtime from the EUI icon map
 * so the list is always in sync with the installed EUI version.
 */
export const getIconTypes = async (): Promise<string[]> => {
  if (!lazyIconTypes.names) {
    const { typeToPathMap } = await import(
      // @ts-expect-error - no declarations for this internal module
      '@elastic/eui/optimize/es/components/icon/icon_map'
    );
    lazyIconTypes.names = Object.keys(typeToPathMap);
  }
  return lazyIconTypes.names;
};

/**
 * Asynchronously preload all EUI icons into the synchronous icon cache.
 */
export const preloadAllEuiIcons = (() => {
  let promise: Promise<void> | undefined;

  return (): Promise<void> => {
    if (!promise) {
      promise = (async () => {
        const { typeToPathMap } = await import(
          // @ts-expect-error - no declarations for this internal module
          '@elastic/eui/optimize/es/components/icon/icon_map'
        );

        // Populate iconTypeNames as a side-effect so getIconTypes() is free
        // after preloading.
        if (!lazyIconTypes.names) {
          lazyIconTypes.names = Object.keys(typeToPathMap);
        }

        const cache: Record<string, ComponentType> = {};

        await Promise.all(
          Object.entries(typeToPathMap).map(async ([type, loader]) => {
            const mod = await (loader as () => Promise<{ icon: ComponentType }>)();
            cache[type] = mod.icon;
          })
        );

        const { appendIconComponentCache } = await import(
          // @ts-expect-error - no declarations for this internal module
          '@elastic/eui/optimize/es/components/icon/icon'
        );
        appendIconComponentCache(cache);
      })();
    }
    return promise;
  };
})();

/**
 * Replace the SVG content inside an EUI icon DOM element with a different
 * icon type. Uses the pre-built icon SVG cache (from buildIconCache) to
 * avoid React renders and flushSync side-effects on live element roots.
 * Falls back to a temporary React render if the cache is not yet built.
 *
 * @param container - The DOM element containing the icon SVG.
 * @param iconType - The EUI icon type name to render.
 */
export const replaceIconContent = (container: Element, iconType: string): void => {
  const isSvg = (el: Element) => el.tagName.toLowerCase() === 'svg';
  const targetSvg = isSvg(container) ? container : container.querySelector('svg');

  // Try the pre-built cache first (no React render needed)
  const cached = lazyIconCache.svgs?.get(iconType);
  if (cached && targetSvg) {
    while (targetSvg.firstChild) {
      targetSvg.removeChild(targetSvg.firstChild);
    }
    for (const child of cached.children) {
      targetSvg.appendChild(child.cloneNode(true));
    }
    for (const attr of ['viewBox', 'width', 'height']) {
      const val = cached.svg.getAttribute(attr);
      if (val) {
        targetSvg.setAttribute(attr, val);
      }
    }
    container.setAttribute('data-icon-type', iconType);
    return;
  }

  try {
    const tmp = document.createElement('div');
    const root = createRoot(tmp);
    try {
      flushSync(() => {
        root.render(createElement(EuiIcon, { type: iconType }));
      });
      const rendered = tmp.firstElementChild;
      if (!rendered) return;

      const newSvg = isSvg(rendered) ? rendered : rendered.querySelector('svg');
      if (!newSvg) return;

      if (targetSvg) {
        while (targetSvg.firstChild) {
          targetSvg.removeChild(targetSvg.firstChild);
        }
        for (const child of newSvg.childNodes) {
          targetSvg.appendChild(child.cloneNode(true));
        }
        for (const attr of ['viewBox', 'width', 'height']) {
          const val = newSvg.getAttribute(attr);
          if (val) {
            targetSvg.setAttribute(attr, val);
          }
        }
      } else {
        container.appendChild(newSvg.cloneNode(true));
      }
      container.setAttribute('data-icon-type', iconType);
    } finally {
      root.unmount();
      tmp.remove();
    }
  } catch {
    // Fallback render failed. The icon content is unchanged.
    // This is non-critical: the user simply sees the previous icon.
  }
};

/**
 * Sets an attribute on an element, replacing SVG icon content for icon-type attributes.
 *
 * @param element - The target DOM element.
 * @param attribute - The attribute name to set.
 * @param value - The attribute value.
 */
export const applySourceAttribute = (element: Element, attribute: string, value: string): void => {
  if (attribute === 'data-icon-type') {
    replaceIconContent(element, value);
  } else {
    element.setAttribute(attribute, value);
  }
};

/** Cached SVG data per icon type: child nodes and SVG attributes. */
interface IconSvgEntry {
  /** Cloned child nodes (paths, etc.) of the rendered SVG. */
  children: Node[];
  /** The full rendered SVG element (for reading attributes like viewBox). */
  svg: SVGSVGElement;
}

const lazyIconCache = {
  pathToType: undefined as Map<string, string> | undefined,
  svgs: undefined as Map<string, IconSvgEntry> | undefined,
  buildPromise: undefined as Promise<Map<string, string>> | undefined,
};

/**
 * Build a reverse lookup map from SVG path `d` attribute to icon type name,
 * and a forward cache of rendered SVG children per icon type.
 * Built lazily on first call; requires icons to be preloaded.
 *
 * NOTE: If called before `preloadAllEuiIcons` completes, the cache will
 * only contain icons that have been loaded so far. Callers that hit a
 * cache miss fall back to a temporary React render via `replaceIconContent`,
 * so correctness is preserved - only performance is degraded.
 */
const buildIconCache = (): Promise<Map<string, string>> => {
  if (lazyIconCache.pathToType) return Promise.resolve(lazyIconCache.pathToType);
  if (lazyIconCache.buildPromise) return lazyIconCache.buildPromise;

  lazyIconCache.buildPromise = buildIconCacheImpl().catch((err) => {
    lazyIconCache.buildPromise = undefined;
    throw err;
  });
  return lazyIconCache.buildPromise;
};

const buildIconCacheImpl = async (): Promise<Map<string, string>> => {
  const types = await getIconTypes();
  const pMap = new Map<string, string>();
  const svgMap = new Map<string, IconSvgEntry>();
  const tmp = document.createElement('div');
  const root = createRoot(tmp);

  try {
    for (let i = 0; i < types.length; i++) {
      const iconType = types[i];
      flushSync(() => {
        root.render(createElement(EuiIcon, { type: iconType, key: iconType }));
      });

      // Yield to the event loop every 50 icons to avoid monopolizing
      // the main thread.
      if (i % 50 === 49) {
        await new Promise<void>((r) => setTimeout(r, 0));
      }
      const rendered = tmp.firstElementChild;
      if (!rendered) continue;
      const isSvg = rendered.tagName.toLowerCase() === 'svg';
      const svg = isSvg ? rendered : rendered.querySelector('svg');
      if (!svg) continue;

      // Cache the rendered SVG children for replaceIconContent
      const children = Array.from(svg.childNodes).map((n) => n.cloneNode(true));
      svgMap.set(iconType, {
        children,
        svg: svg.cloneNode(false) as SVGSVGElement,
      });

      // Build reverse path fingerprint map
      const firstPath = svg.querySelector('path');
      if (firstPath) {
        const d = firstPath.getAttribute('d');
        if (d) pMap.set(d, iconType);
      }
    }
  } finally {
    root.unmount();
    tmp.remove();
  }

  lazyIconCache.pathToType = pMap;
  lazyIconCache.svgs = svgMap;
  return pMap;
};

/**
 * Identify an EUI icon type from an SVG element by matching its path data
 * against known icons. Returns the icon type name or empty string.
 *
 * @param svgElement - The SVG element to identify.
 * @returns The icon type name, or an empty string if unrecognised.
 */
export const identifyIconType = async (svgElement: Element): Promise<string> => {
  const firstPath = svgElement.querySelector('path');
  if (!firstPath) return '';
  const d = firstPath.getAttribute('d');
  if (!d) return '';
  const map = await buildIconCache();
  return map.get(d) ?? '';
};
