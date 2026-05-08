/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import type { z } from '@kbn/zod';
import { z as zod } from '@kbn/zod';

import { SchemaTypeError, SchemaTypesError, ValidationError } from '../errors';
import type {
  ExtendsDeepOptions,
  SchemaStructureEntry,
  SchemaValidationOptions,
  TypeOptions,
} from './interfaces';
import { prependPathSegment, unwrapValidationError } from './error_utils';
import { Reference } from '../references';
import { LiteralType } from './literal_type';
import { MaybeType } from './maybe_type';
import { ObjectType } from './object_type';
import { Type } from './type';

/**
 * Joi parity: `oneOf([schema.object({ only schema.maybe(...) })])` must reject `undefined` even though
 * `{}` would validate — otherwise required parent keys accept missing values when inner coerces
 * `undefined` → `{}`.
 */
function isOnlyMaybeObjectBranch(branch: Type<any>): branch is ObjectType<any> {
  if (!(branch instanceof ObjectType)) {
    return false;
  }
  const props = branch.getPropSchemas();
  const keys = Object.keys(props);
  if (keys.length === 0) {
    return false;
  }
  return Object.values(props).every((p) => p instanceof MaybeType);
}

/** Object branches where `undefined` is coerced to `{}` and validates (empty shape or all-`maybe` keys). */
function objectBranchTreatsUndefinedAsEmptyObject(branch: Type<any>): boolean {
  if (!(branch instanceof ObjectType)) {
    return false;
  }
  const props = branch.getPropSchemas();
  const keys = Object.keys(props);
  if (keys.length === 0) {
    return true;
  }
  return Object.values(props).every((p) => p instanceof MaybeType);
}

function hasNullLiteralBranch(types: readonly Type<any>[]): boolean {
  return types.some((t) => t instanceof LiteralType && t.expectedValue === null);
}

export type UnionTypeOptions<T> = TypeOptions<T>;

/** Output type for `schema.oneOf([...])` — union of each branch validated output. */
export type UnionSchemaOutputs<RTS extends readonly Type<any>[]> = {
  [K in keyof RTS]: RTS[K] extends { readonly type: infer V } ? V : never;
}[number];

export class UnionType<
  RTS extends readonly Type<any>[],
  T = UnionSchemaOutputs<RTS>
> extends Type<T> {
  protected readonly unionTypes: RTS;
  private readonly unionOptions?: UnionTypeOptions<T>;

  constructor(types: RTS, options?: UnionTypeOptions<T>) {
    let schema: z.ZodTypeAny;
    if (types.length === 1) {
      schema = types[0].getInternalSchema();
    } else {
      const zodTypes = types.map((t) => t.getInternalSchema()) as [
        z.ZodTypeAny,
        z.ZodTypeAny,
        ...z.ZodTypeAny[]
      ];
      schema = zod.union(zodTypes);
    }
    if (options?.meta?.id) {
      schema = schema.meta({ id: options.meta.id });
    }
    super(schema, options as any);
    this.unionTypes = types;
    this.unionOptions = options;
  }

  protected validateWithFrame(
    _frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    context: Record<string, unknown>,
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): T {
    let val: unknown = value;
    if (val === undefined && this.typeOptions.defaultValue !== undefined) {
      const def = this.typeOptions.defaultValue;
      if (typeof def === 'function') {
        val = (def as () => T)();
      } else if (Reference.isReference(def)) {
        val = def.resolve() as T;
      } else {
        val = def as T;
      }
    }

    if (
      val === undefined &&
      this.unionTypes.length === 1 &&
      this.typeOptions.defaultValue === undefined &&
      isOnlyMaybeObjectBranch(this.unionTypes[0])
    ) {
      throw new ValidationError(
        new SchemaTypeError(`expected at least one defined value but got [${typeDetect(val)}]`, []),
        namespace
      );
    }

    if (
      val === undefined &&
      this.typeOptions.defaultValue === undefined &&
      hasNullLiteralBranch(this.unionTypes) &&
      this.unionTypes.some(objectBranchTreatsUndefinedAsEmptyObject)
    ) {
      throw new ValidationError(
        new SchemaTypeError(`expected at least one defined value but got [${typeDetect(val)}]`, []),
        namespace
      );
    }

    const errors: SchemaTypeError[] = [];

    for (let i = 0; i < this.unionTypes.length; i++) {
      try {
        return this.unionTypes[i].validate(val, context, undefined, validationOptions) as T;
      } catch (e) {
        const inner = unwrapValidationError(e);
        if (!inner) {
          throw e;
        }
        if (this.unionTypes.length === 1) {
          throw new ValidationError(inner, namespace);
        }
        errors.push(prependPathSegment(String(i), inner));
      }
    }

    throw new ValidationError(
      new SchemaTypesError('types that failed validation:', [], errors),
      namespace
    );
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    return new UnionType(
      this.unionTypes.map((t) => t.extendsDeep(options)) as unknown as RTS,
      this.unionOptions
    );
  }

  public addLazyRegistryEntries(map: Map<string, unknown>): void {
    for (const t of this.unionTypes) {
      t.addLazyRegistryEntries(map);
    }
  }

  protected handleError(
    type: string,
    context: Record<string, any>,
    _path: string[]
  ): string | SchemaTypeError | undefined {
    const { value } = context;
    switch (type) {
      case 'any.required':
      case 'invalid_type':
        return `expected at least one defined value but got [${typeDetect(value)}]`;
      default:
        return undefined;
    }
  }

  public getSchemaStructure(): SchemaStructureEntry[] {
    const path: string[] = [];
    return [{ path, type: this.structureTypeLabel() }];
  }

  protected structureTypeLabel(): string {
    return this.unionTypes.map((t) => t.getStructureLabel()).join('|');
  }
}
