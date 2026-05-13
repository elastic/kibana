/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as EuiExports from '@elastic/eui';

/**
 * Set of real, importable EUI component names derived from `@elastic/eui`
 * exports. Built once at module load. Only includes PascalCase names starting
 * with `Eui` that are functions or objects (i.e. actual components, not types
 * or constants).
 */
export const EUI_COMPONENTS: ReadonlySet<string> = new Set(
  Object.keys(EuiExports).filter(
    (k) => /^Eui[A-Z]/.test(k) && typeof (EuiExports as Record<string, unknown>)[k] !== 'string'
  )
);

/**
 * Map a CSS class name (e.g. `euiAvatar`) to its EUI component name
 * (e.g. `EuiAvatar`), but only if that component is actually exported
 * from `@elastic/eui`.
 */
export const resolveEuiTag = (el: Element): string | null => {
  for (const cls of el.classList) {
    if (/^eui[A-Z]/.test(cls)) {
      const candidate = cls.charAt(0).toUpperCase() + cls.slice(1);
      if (EUI_COMPONENTS.has(candidate)) return candidate;
    }
  }
  return null;
};

/**
 * Walk the React fiber tree attached to a DOM node and return the nearest
 * named component, but only if this element is the root DOM node that
 * component renders. This prevents inner elements (e.g. a `<span>` inside
 * EuiButton) from also resolving to the parent component name.
 */
export const resolveReactComponentName = (el: Element): string | null => {
  const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
  if (!fiberKey) return null;

  const hostFiber = (el as unknown as Record<string, unknown>)[fiberKey] as {
    type?: { displayName?: string; name?: string } | string;
    return?: unknown;
    child?: unknown;
  } | null;

  if (!hostFiber) return null;

  let fiber = hostFiber.return as typeof hostFiber | null;
  while (fiber) {
    const { type } = fiber;
    if (type != null && (typeof type === 'function' || typeof type === 'object')) {
      const name =
        (type as { displayName?: string }).displayName ?? (type as { name?: string }).name;
      if (name && isUsableComponentName(name)) {
        if (isRootChild(fiber, hostFiber)) return name;
        return null;
      }
    }
    fiber = fiber.return as typeof hostFiber | null;
  }

  return null;
};

/**
 * Check if `hostFiber` is the first HostComponent reachable by walking down
 * from `componentFiber.child`. This tells us whether the DOM element is the
 * root element that component renders.
 */
const isRootChild = (componentFiber: { child?: unknown }, hostFiber: unknown): boolean => {
  let child = componentFiber.child as {
    type?: unknown;
    child?: unknown;
    sibling?: unknown;
  } | null;

  while (child) {
    if (child === hostFiber) return true;
    if (typeof child.type === 'string') return child === hostFiber;
    child = child.child as typeof child | null;
  }
  return false;
};

/**
 * Determine whether a fiber component name is meaningful to show in the tree.
 * EUI names are validated against the real export set; non-EUI names are
 * filtered with basic heuristics.
 */
const isUsableComponentName = (name: string): boolean => {
  if (name.length < 3) return false;
  if (!/^[A-Z]/.test(name)) return false;
  if (name === 'Fragment') return false;
  if (/^(ForwardRef|Memo|Context|Provider|Consumer|Suspense|Lazy)$/i.test(name)) return false;
  if (name.startsWith('_')) return false;
  // Only accept names that are real EUI exports
  return EUI_COMPONENTS.has(name);
};

/**
 * Resolve a human-readable tag name for an element. Tries EUI class names
 * first, then React fiber component names, then falls back to the HTML tag.
 */
export const resolveTag = (el: Element): string => {
  return resolveEuiTag(el) ?? resolveReactComponentName(el) ?? el.tagName.toLowerCase();
};
