/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactLikeElement } from './types';
import { getPartKey, getPresetKey } from './factory';

/**
 * Type guard: checks if value has React element structure.
 *
 * @param value - The value to check.
 * @returns `true` if the value looks like a React element.
 */
export const isReactLikeElement = (value: unknown): value is ReactLikeElement =>
  typeof value === 'object' && value !== null && 'type' in value;

/**
 * Gets the part name from a declarative component's static Symbol property.
 *
 * Returns the part name string if the element belongs to the specified
 * assembly, or `undefined` otherwise.
 *
 * @param element - The element to check.
 * @param assembly - The assembly name.
 * @returns The part name string, or `undefined` if not found.
 */
export const getPartType = (element: unknown, assembly: string): string | undefined => {
  if (!isReactLikeElement(element) || !element.type) {
    return undefined;
  }

  const value = element.type[getPartKey(assembly)];
  return typeof value === 'string' ? value : undefined;
};

/** Matches the static Symbol key written by `tagDeclarativeComponent`: `kbn.<assembly>.part`. */
const PART_KEY_PATTERN = /^kbn\.(.+)\.part$/;

/**
 * Gets the assembly and part an element was tagged for, whichever assembly that is.
 *
 * {@link getPartType} only answers "does this belong to the assembly I am parsing".
 * This answers "which assembly does this belong to", which lets a caller tell a part
 * used at the wrong nesting level apart from ordinary passthrough content. Such a part
 * renders as `null`, so without this distinction the mistake is invisible.
 *
 * @param element - The element to check.
 * @returns The assembly and part names, or `undefined` for non-declarative elements.
 */
export const getDeclarativePartTag = (
  element: unknown
): { assembly: string; part: string } | undefined => {
  if (!isReactLikeElement(element) || !element.type) {
    return undefined;
  }

  const { type } = element;
  for (const key of Object.getOwnPropertySymbols(type)) {
    const globalKey = Symbol.keyFor(key);
    const assembly = globalKey ? PART_KEY_PATTERN.exec(globalKey)?.[1] : undefined;
    const part = assembly === undefined ? undefined : type[key];
    if (assembly !== undefined && typeof part === 'string') {
      return { assembly, part };
    }
  }

  return undefined;
};

/**
 * Gets the static preset from a declarative component's Symbol property.
 *
 * @param element - The element to extract the preset from.
 * @param assembly - The assembly name.
 * @returns The preset string, or `undefined` if not found.
 */
export const getPresetId = (element: unknown, assembly: string): string | undefined => {
  if (!isReactLikeElement(element) || !element.type) {
    return undefined;
  }

  const value = element.type[getPresetKey(assembly)];
  return typeof value === 'string' ? value : undefined;
};
