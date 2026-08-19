/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow, get, unset } from 'lodash';

import type { LensAttributes } from '../../../../types';

export type AttributesNormalizer<T extends LensAttributes = LensAttributes> = (
  attributes: NormalizedStates<T>
) => NormalizedStates<T>;

/**
 * Normalizes Lens SO attributes after a transform to compare with the original attributes.
 *
 *  In some cases things like ids, accessors and defaults are different or missing.
 * This function converts the initial attributes to allow comparing with output attributes.
 */
export type NormalizerFn<T extends LensAttributes = LensAttributes> = (attributes: T) => T;

/**
 * Normalizes for Lens SO attributes.
 *
 * You can pass a function to transform the original SO to align with the transformed SO,
 * or you can pass a function to transform the transformed SO to align with the original SO.
 */
export interface NormalizerConfig<T extends LensAttributes = LensAttributes> {
  original?: NormalizerFn<T>;
  transformed?: NormalizerFn<T>;
  /**
   * String paths to ignore in the original and transformed attributes. (i.e. `'state.query'`)
   */
  ignore?: string[];
  order?: number; // for sorting
}

export interface NormalizedStates<T extends LensAttributes = LensAttributes> {
  original: T;
  transformed: T;
}

export function normalize<T extends LensAttributes>(normalizer?: NormalizerConfig<T>) {
  return function (attributes: NormalizedStates<T>): NormalizedStates<T> {
    return {
      original: ignorePaths(
        normalizer?.original?.(attributes.original) ?? attributes.original,
        normalizer?.ignore ?? []
      ),
      transformed: ignorePaths(
        normalizer?.transformed?.(attributes.transformed) ?? attributes.transformed,
        normalizer?.ignore ?? []
      ),
    };
  };
}

export function mergeNormalizers<T extends LensAttributes>(
  normalizers: NormalizerConfig<T>[],
  ignore: string[] = []
): AttributesNormalizer<T> {
  return function (attributes: NormalizedStates<T>): NormalizedStates<T> {
    const sortedNormalizers = [...normalizers].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return flow([...sortedNormalizers, { ignore }].map(normalize))(attributes);
  };
}

export function ignorePaths<T extends Record<string, unknown>>(obj: T, paths: string[]) {
  if (paths.length === 0) {
    return obj;
  }

  const result = structuredClone(obj);

  for (const path of paths) {
    if (path.includes('*')) {
      for (const resolved of resolveWildcardPath(result, path.split('.'))) {
        unset(result, resolved);
      }
    } else {
      unset(result, path);
    }
  }

  return result;
}

function resolveWildcardPath(
  obj: Record<string, unknown>,
  segments: string[],
  prefix: string[] = []
): string[][] {
  if (segments.length === 0) {
    return [prefix];
  }

  const [head, ...tail] = segments;

  if (head === '*') {
    const parent = prefix.length > 0 ? get(obj, prefix) : obj;
    if (parent == null || typeof parent !== 'object') {
      return [];
    }

    return Object.keys(parent).flatMap((key) => resolveWildcardPath(obj, tail, [...prefix, key]));
  }

  return resolveWildcardPath(obj, tail, [...prefix, head]);
}

/**
 * Returns the values at the given dot-separated path, supporting `*` wildcards.
 */
export function getValues<T = unknown>(obj: Record<string, unknown>, path: string): T[] {
  if (path.includes('*')) {
    return resolveWildcardPath(obj, path.split('.')).map((resolved) => get(obj, resolved) as T);
  }

  const value = get(obj, path) as T | undefined;
  return value === undefined ? [] : [value];
}
