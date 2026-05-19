/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
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
  /**
   * The original component function from the React element's `type` field.
   *
   * Carried through from parsing so that the resolver can look up the
   * per-component-instance resolver registered via `createComponent`. This
   * is the only way to distinguish two custom parts that share the same
   * part name but were created by different `createComponent` calls — the
   * component function reference is unique per call.
   */
  componentType?: (...args: unknown[]) => unknown;
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
export declare const parseDeclarativeChildren: (
  children: ReactNode,
  assembly: string
) => ParsedItem[];
