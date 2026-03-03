/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Children, Fragment, isValidElement } from 'react';
import type { ReactNode } from 'react';
import { getPartType, getPresetId } from './identification';

// ─────────────────────────────────────────────────────────────────────────────
// Instance ID helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds the next unused auto-generated ID for a given base name.
 *
 * When `base` is a preset (e.g., `'button'`), numbering starts at 1
 * because the preset string itself serves as the first implicit ID.
 * When `base` is a part name (e.g., `'control'`), numbering starts at 0.
 */
const nextAutoId = (base: string, startAt: number, seen: Set<string>): string => {
  let counter = startAt;
  let candidate = `${base}-${counter}`;
  while (seen.has(candidate)) {
    counter++;
    candidate = `${base}-${counter}`;
  }
  return candidate;
};

// ─────────────────────────────────────────────────────────────────────────────
// Parsed item types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A parsed declarative part extracted from React children.
 *
 * The `part` and `preset` fields are the names provided when calling
 * `definePart` and `createPreset`. The `attributes` are the component's
 * props as declared in JSX.
 */
export interface ParsedPart {
  /** Discriminator. Always `'part'` for declarative parts. */
  type: 'part';
  /** Part name (e.g., `'column'`, `'filter'`). */
  part: string;
  /** Preset name (e.g., `'name'`, `'sort'`), or `undefined` for custom parts. */
  preset?: string;
  /** Unique instance identity, resolved from `props.id`, preset, or auto-generated. */
  instanceId: string;
  /** The component's props as declared in JSX. */
  attributes: Record<string, unknown>;
}

/**
 * A non-part child from the React tree.
 *
 * Passthrough children that are not declarative parts (e.g., plain text,
 * unknown components) are preserved in source order.
 */
export interface ParsedChild {
  /** Discriminator. Always `'child'` for passthrough children. */
  type: 'child';
  /** The original React node. */
  node: ReactNode;
}

/**
 * A single item from the parse result -- either a declarative part or
 * a passthrough child. Use the `type` field to discriminate.
 */
export type ParsedItem = ParsedPart | ParsedChild;

// ─────────────────────────────────────────────────────────────────────────────
// parseDeclarativeChildren
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses declarative components from React children.
 *
 * Walks the children of the given assembly name, matching all part types
 * in a single pass. Returns a flat array in source order. Each element
 * is either a `ParsedPart` or a `ParsedChild`, discriminated by `type`.
 *
 * **Instance ID resolution** follows a convention:
 * 1. If the element has `props.id` (string), it becomes the `instanceId`.
 *    Duplicate explicit IDs warn and are dropped.
 * 2. If no `props.id`, the static `preset` is used. If that collides with
 *    an already-seen ID, an auto-generated suffix is appended.
 * 3. If no `props.id` and no `preset`, an ID is auto-generated from the
 *    part name (e.g., `'column-0'`).
 *
 * Duplicate detection is scoped per part name.
 */
export const parseDeclarativeChildren = (children: ReactNode, assembly: string): ParsedItem[] => {
  if (children == null) {
    return [];
  }

  return walkChildren(children, assembly);
};

// ─────────────────────────────────────────────────────────────────────────────
// Core child walker
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core implementation that walks React children, unwraps fragments,
 * identifies declarative components by their static Symbol properties,
 * resolves instance IDs, and extracts props as configuration.
 *
 * All part types within the assembly are matched.
 */
const walkChildren = (children: ReactNode, assembly: string): ParsedItem[] => {
  const result: ParsedItem[] = [];

  // Track seen instance IDs per part name.
  const seenByPart = new Map<string, Set<string>>();

  const getSeenIds = (partName: string): Set<string> => {
    let seen = seenByPart.get(partName);
    if (!seen) {
      seen = new Set<string>();
      seenByPart.set(partName, seen);
    }
    return seen;
  };

  const processChild = (child: ReactNode): void => {
    // Non-element children (strings, numbers, etc.) are passthrough.
    if (!isValidElement(child)) {
      if (child != null) {
        result.push({ type: 'child', node: child });
      }
      return;
    }

    // Unwrap fragments -- recurse into their children preserving order.
    if (child.type === Fragment) {
      const fragmentChildren: ReactNode = child.props?.children;
      Children.forEach(fragmentChildren, processChild);
      return;
    }

    // Determine the matched part name from component statics.
    const partName = getPartType(child, assembly);

    if (!partName) {
      result.push({ type: 'child', node: child });
      return;
    }

    const props: Record<string, unknown> = child.props ?? {};
    const preset = getPresetId(child, assembly);
    // Empty strings are treated as "no explicit id" (falsy check below).
    const propsId = typeof props.id === 'string' ? props.id : undefined;
    // `child.type` is a declarative component function at this point
    // (string HTML tags were filtered by `getPartType` above), but
    // TypeScript's React types don't model `displayName` on
    // `JSXElementConstructor`, so a cast through `unknown` is needed.
    const displayName =
      typeof child.type !== 'string'
        ? (child.type as unknown as { displayName?: string }).displayName
        : undefined;
    const seenIds = getSeenIds(partName);

    // Resolve instance ID.
    let instanceId: string;

    if (propsId) {
      if (seenIds.has(propsId)) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn(
            `[${assembly}] Duplicate ${partName} id: "${propsId}"` +
              (displayName ? ` (${displayName})` : '')
          );
        }
        return;
      }
      instanceId = propsId;
    } else if (preset && !seenIds.has(preset)) {
      instanceId = preset;
    } else {
      instanceId = nextAutoId(preset ?? partName, preset ? 1 : 0, seenIds);
    }

    seenIds.add(instanceId);

    // Props are the attributes -- no parser transformation.
    result.push({ type: 'part', part: partName, preset, instanceId, attributes: props });
  };

  Children.forEach(children, processChild);

  return result;
};
