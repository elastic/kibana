/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataModel } from './data_model';
import type { CatalogFunction, DataBinding, DynamicValue, FunctionCall, JsonValue } from './types';

export interface ResolveScope {
  dataModel: DataModel;
  functions: Record<string, CatalogFunction>;
  /** Set while rendering a `ChildList` template; relative paths resolve under it. */
  basePath?: string;
  /** 0-based position within the template list, exposed via the `@index` function. */
  index?: number;
}

/**
 * DataBinding is `{ path }` and nothing else (`additionalProperties: false` in
 * the spec). The strictness matters: a `ChildList` template is
 * `{ componentId, path }`, and a looser check would silently treat it as a
 * binding and resolve the template away.
 */
export function isDataBinding(value: unknown): value is DataBinding {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'path' in value &&
    Object.keys(value).length === 1
  );
}

export function isFunctionCall(value: unknown): value is FunctionCall {
  return typeof value === 'object' && value !== null && 'call' in value;
}

/**
 * Absolute pointers ignore the template scope entirely; relative ones are
 * appended to it. This is what lets a list template reuse one component
 * definition across every row.
 */
export function resolvePath(path: string, basePath?: string): string {
  if (path.startsWith('/')) return path;
  if (!basePath) return `/${path}`;
  return `${basePath}/${path}`;
}

export function resolveDynamic(value: DynamicValue, scope: ResolveScope): JsonValue | undefined {
  if (isDataBinding(value)) {
    return scope.dataModel.get(resolvePath(value.path, scope.basePath));
  }

  if (isFunctionCall(value)) {
    if (value.call === '@index') {
      const offset = value.args?.offset;
      const resolvedOffset = offset === undefined ? 0 : resolveDynamic(offset, scope);
      return (scope.index ?? 0) + (typeof resolvedOffset === 'number' ? resolvedOffset : 0);
    }

    const fn = scope.functions[value.call];
    if (!fn) return undefined;

    const args: Record<string, JsonValue> = {};
    for (const [key, arg] of Object.entries(value.args ?? {})) {
      const resolved = resolveDynamic(arg, scope);
      if (resolved !== undefined) args[key] = resolved;
    }
    return fn(args);
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveDynamic(item, scope) ?? null);
  }

  /**
   * Structured props hold bindings too — a DescriptionList's `items`, a Table's
   * `columns`. Without recursing here those would reach the component as raw
   * `{ path }` objects and render blank, which is far harder to diagnose than a
   * hard failure. Bindings and function calls are handled above, so anything
   * reaching this point is an ordinary container.
   */
  if (typeof value === 'object' && value !== null) {
    const resolved: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      const next = resolveDynamic(item as DynamicValue, scope);
      if (next !== undefined) resolved[key] = next;
    }
    return resolved;
  }

  return value as JsonValue;
}

/**
 * Only the envelope is skipped. Child references are left to flow through as
 * ordinary props because the spec lets any property name hold a `ComponentId`
 * or `ChildList` — a component implementation knows its own schema and passes
 * the right prop to `buildChild`.
 */
const ENVELOPE_KEYS = new Set(['id', 'component', 'catalogId', 'accessibility']);

export function resolveProps(
  definition: Record<string, unknown>,
  scope: ResolveScope
): Record<string, JsonValue | undefined> {
  const resolved: Record<string, JsonValue | undefined> = {};
  for (const [key, value] of Object.entries(definition)) {
    if (ENVELOPE_KEYS.has(key)) continue;
    resolved[key] = resolveDynamic(value as DynamicValue, scope);
  }
  return resolved;
}

/**
 * Finds the data model path a prop is bound to, so an input component can write
 * back to it. Returns undefined for literals, which are read-only by nature.
 */
export function bindingPathOf(value: unknown, scope: ResolveScope): string | undefined {
  return isDataBinding(value) ? resolvePath(value.path, scope.basePath) : undefined;
}
