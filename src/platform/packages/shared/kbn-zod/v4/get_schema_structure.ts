/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Produces a structure list similar to {@link Type.getSchemaStructure} from `@kbn/config-schema`,
 * for Zod v4 schemas (`z` from `@kbn/zod`). Used for saved-object fixture templates and tooling.
 *
 * @remarks
 * This walks Zod's public `def` / `shape` API (Zod v4). Rare wrappers (effects, custom refinements)
 * may fall back to a coarse label from `def.type`.
 */

import type { z } from 'zod/v4';
import { isZod } from './util';

export interface ModelVersionSchemaProperty {
  path: string[];
  type: string;
}

function defOf(schema: z.ZodType): object {
  const def = Reflect.get(schema, 'def');
  if (typeof def === 'object' && def !== null) {
    return def;
  }
  return {};
}

function defType(schema: z.ZodType): string {
  const def = defOf(schema);
  const t = Reflect.get(def, 'type');
  return typeof t === 'string' ? t : 'unknown';
}

function asZodType(value: unknown): z.ZodType | undefined {
  return isZod(value) ? value : undefined;
}

interface UnwrappedZod {
  inner: z.ZodType;
  isOptional: boolean;
  isNullable: boolean;
}

function unwrapZodWrappers(schema: z.ZodType): UnwrappedZod {
  let inner: z.ZodType = schema;
  let isOptional = false;
  let isNullable = false;

  for (;;) {
    const kind = defType(inner);
    const def = defOf(inner);
    if (kind === 'optional') {
      isOptional = true;
      const next = asZodType(Reflect.get(def, 'innerType'));
      if (!next) {
        break;
      }
      inner = next;
    } else if (kind === 'nullable') {
      isNullable = true;
      const next = asZodType(Reflect.get(def, 'innerType'));
      if (!next) {
        break;
      }
      inner = next;
    } else if (kind === 'default' || kind === 'catch') {
      const next = asZodType(Reflect.get(def, 'innerType'));
      if (!next) {
        break;
      }
      inner = next;
    } else if (kind === 'readonly') {
      const next = asZodType(Reflect.get(def, 'innerType'));
      if (!next) {
        break;
      }
      inner = next;
    } else if (kind === 'pipe') {
      const next = asZodType(Reflect.get(def, 'in'));
      if (!next) {
        break;
      }
      inner = next;
    } else {
      break;
    }
  }

  return { inner, isOptional, isNullable };
}

function modifierSuffix(isOptional: boolean, isNullable: boolean): string {
  let s = '';
  if (isOptional) {
    s += '?';
  }
  if (isNullable) {
    s += '|null';
  }
  return s;
}

function formatLeafTypeLabel(schema: z.ZodType): string {
  const kind = defType(schema);
  const def = defOf(schema);

  switch (kind) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'bigint':
    case 'date':
    case 'symbol':
    case 'undefined':
    case 'null':
    case 'void':
    case 'never':
    case 'any':
    case 'unknown':
      return kind;
    case 'literal': {
      const values = Reflect.get(def, 'values');
      if (Array.isArray(values) && values.length > 0) {
        return values.map((v: unknown) => JSON.stringify(v)).join('|');
      }
      return 'literal';
    }
    case 'enum': {
      const entries = Reflect.get(def, 'entries');
      if (entries && typeof entries === 'object') {
        return [...new Set(Object.values(entries))].join('|');
      }
      return 'enum';
    }
    case 'array': {
      const element = asZodType(Reflect.get(def, 'element'));
      if (!element) {
        return 'array';
      }
      const uw = unwrapZodWrappers(element);
      if (defType(uw.inner) === 'object') {
        return 'array';
      }
      return `${formatTypeDescriptor(uw.inner, uw.isOptional, uw.isNullable)}[]`;
    }
    case 'record':
      return 'record';
    case 'map':
      return 'map';
    case 'set':
      return 'set';
    case 'tuple':
      return 'tuple';
    case 'union': {
      const options = Reflect.get(def, 'options');
      if (!Array.isArray(options) || options.length === 0) {
        return 'union';
      }
      const parts = options
        .map((opt: unknown) => (isZod(opt) ? formatTypeDescriptorFromSchema(opt) : 'unknown'))
        .filter(Boolean);
      return [...new Set(parts)].join('|');
    }
    case 'intersection':
      return 'intersection';
    case 'lazy': {
      const getter = Reflect.get(def, 'getter');
      if (typeof getter === 'function') {
        const inner = asZodType(getter());
        if (inner) {
          return formatLeafTypeLabel(inner);
        }
      }
      return 'lazy';
    }
    default:
      return kind;
  }
}

function formatTypeDescriptor(inner: z.ZodType, isOptional: boolean, isNullable: boolean): string {
  return `${formatLeafTypeLabel(inner)}${modifierSuffix(isOptional, isNullable)}`;
}

function formatTypeDescriptorFromSchema(schema: z.ZodType): string {
  const { inner, isOptional, isNullable } = unwrapZodWrappers(schema);
  return formatTypeDescriptor(inner, isOptional, isNullable);
}

/**
 * Returns leaf paths and type labels for a Zod schema, aligned with
 * `ObjectType#getSchemaStructure()` output shape used by fixture tooling.
 */
export function getZodSchemaStructure(schema: z.ZodType): ModelVersionSchemaProperty[] {
  return collectProperties(schema, []);
}

function getObjectShape(schema: z.ZodType): Record<string, z.ZodType> | undefined {
  const shape = Reflect.get(schema, 'shape');
  if (typeof shape !== 'object' || shape === null || Array.isArray(shape)) {
    return undefined;
  }
  const out: Record<string, z.ZodType> = {};
  for (const key of Object.keys(shape)) {
    const v = Reflect.get(shape, key);
    if (isZod(v)) {
      out[key] = v;
    }
  }
  return out;
}

function collectProperties(schema: z.ZodType, path: string[]): ModelVersionSchemaProperty[] {
  const { inner, isOptional, isNullable } = unwrapZodWrappers(schema);
  const kind = defType(inner);

  if (kind === 'object') {
    const shape = getObjectShape(inner);
    if (!shape) {
      return [{ path, type: formatTypeDescriptor(inner, isOptional, isNullable) }];
    }
    const results: ModelVersionSchemaProperty[] = [];
    for (const key of Object.keys(shape)) {
      results.push(...collectProperties(shape[key], [...path, key]));
    }
    return results;
  }

  if (kind === 'intersection') {
    const intersectionDef = defOf(inner);
    const left = asZodType(Reflect.get(intersectionDef, 'left'));
    const right = asZodType(Reflect.get(intersectionDef, 'right'));
    const results: ModelVersionSchemaProperty[] = [];
    if (left) {
      results.push(...collectProperties(left, path));
    }
    if (right) {
      results.push(...collectProperties(right, path));
    }
    return results.length > 0
      ? results
      : [{ path, type: formatTypeDescriptor(inner, isOptional, isNullable) }];
  }

  if (kind === 'lazy') {
    const getter = Reflect.get(defOf(inner), 'getter');
    if (typeof getter === 'function') {
      const resolved = asZodType(getter());
      if (resolved) {
        return collectProperties(resolved, path);
      }
    }
    return [{ path, type: formatTypeDescriptor(inner, isOptional, isNullable) }];
  }

  return [
    {
      path,
      type: formatTypeDescriptor(inner, isOptional, isNullable),
    },
  ];
}
