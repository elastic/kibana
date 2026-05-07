/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from 'lodash';
import typeDetect from 'type-detect';
import type { z } from '@kbn/zod';
import { z as zod } from '@kbn/zod';

import { SchemaTypeError, ValidationError } from '../errors';
import { getValidationFrame } from '../validation_frame';
import type {
  ExtendsDeepOptions,
  SchemaValidationOptions,
  TypeOptions,
  UnknownOptions,
} from './interfaces';
import { Reference } from '../references';
import { prependPropertyKey } from './error_utils';
import { Lazy } from './lazy';
import { NeverType } from './never_type';
import { effectiveUnknowns } from './object_helpers';
import { Type } from './type';

export type Props = Record<string, Type<any>>;

export type NullableProps = Record<string, Type<any> | undefined | null>;

export type TypeOrLazyType = Type<any> | (() => Type<any>);

export type TypeOf<RT extends TypeOrLazyType> = RT extends () => Type<any>
  ? ReturnType<RT>['type']
  : RT extends Type<any>
  ? RT['type']
  : never;

type OptionalProperties<Base extends Props> = Pick<
  Base,
  {
    [Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? Key : never;
  }[keyof Base]
>;

type RequiredProperties<Base extends Props> = Pick<
  Base,
  {
    [Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? never : Key;
  }[keyof Base]
>;

export type ObjectResultType<P extends Props> = Readonly<
  { [K in keyof OptionalProperties<P>]?: TypeOf<P[K]> } & {
    [K in keyof RequiredProperties<P>]: TypeOf<P[K]>;
  }
>;

type DefinedProperties<Base extends NullableProps> = Pick<
  Base,
  {
    [Key in keyof Base]: undefined extends Base[Key] ? never : null extends Base[Key] ? never : Key;
  }[keyof Base]
>;

type ExtendedProps<P extends Props, NP extends NullableProps> = Omit<P, keyof NP> & {
  [K in keyof DefinedProperties<NP>]: NP[K];
};

type ExtendedObjectType<P extends Props, NP extends NullableProps> = ObjectType<
  ExtendedProps<P, NP>
>;

type ExtendedObjectTypeOptions<P extends Props, NP extends NullableProps> = ObjectTypeOptions<
  ExtendedProps<P, NP>
>;

interface ObjectTypeOptionsMeta {
  id?: string;
}

export type ObjectTypeOptions<P extends Props = any> = TypeOptions<ObjectResultType<P>> &
  UnknownOptions & { meta?: TypeOptions<ObjectResultType<P>>['meta'] & ObjectTypeOptionsMeta };

export class ObjectType<P extends Props = any> extends Type<ObjectResultType<P>> {
  protected props: P;
  private readonly unknownsSetting: ObjectTypeOptions<P>['unknowns'];

  constructor(props: P, options: ObjectTypeOptions<P> = {}) {
    const { unknowns, ...typeOptions } = options;
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [key, value] of Object.entries(props)) {
      shape[key] = value.getSchema();
    }

    let objSchema = zod.object(shape);
    const staticUnknown = unknowns ?? 'forbid';
    if (staticUnknown === 'allow') {
      objSchema = objSchema.passthrough();
    } else if (staticUnknown === 'forbid') {
      objSchema = objSchema.strict();
    } else {
      objSchema = objSchema.strip();
    }

    if (options.meta?.id) {
      objSchema = objSchema.meta({ id: options.meta.id });
    }

    super(objSchema.optional().default({}), typeOptions as TypeOptions<ObjectResultType<P>>);

    this.unknownsSetting = unknowns;
    this.props = props;

    const lazyRegistryProbe = new Map<string, unknown>();
    this.addLazyRegistryEntries(lazyRegistryProbe);
    for (const child of Object.values(props)) {
      child.addLazyRegistryEntries(lazyRegistryProbe);
    }

    if (options.meta?.id) {
      for (const p of Object.values(props)) {
        if (p instanceof Lazy && p.lazyId === options.meta.id) {
          p.bindResolver(this);
        }
      }
    }
  }

  /**
   * Zod `getSchema()` is not Joi-compatible: expose legacy `describe().flags` / `{ error, value }` validation shims.
   */
  public getSchema(): z.ZodType<ObjectResultType<P>> {
    const schema = super.getSchema();
    const id = this.typeOptions.meta?.id;
    const describe = schema.describe.bind(schema);
    const self = this;
    return new Proxy(schema, {
      get(target, prop, receiver) {
        if (prop === 'validate') {
          return (data: unknown, opts?: { context?: Record<string, unknown> }) => {
            try {
              const value = self.validate(data, opts?.context ?? {});
              return { value, error: undefined };
            } catch (e) {
              const msg =
                e instanceof ValidationError
                  ? e.message
                  : e instanceof Error
                  ? e.message
                  : String(e);
              return { value: data, error: { message: msg } };
            }
          };
        }
        if (prop === 'describe') {
          return () => {
            const base = describe();
            if (!id) {
              return base;
            }
            return Object.assign(base, {
              flags: Object.assign({}, (base as { flags?: { id?: string } }).flags, { id }),
            });
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as z.ZodType<ObjectResultType<P>>;
  }

  private resolveObjectLevelDefaults(): Record<string, unknown> | undefined {
    const dv = this.typeOptions.defaultValue;
    if (dv === undefined) {
      return undefined;
    }
    let resolved: unknown;
    if (typeof dv === 'function') {
      resolved = (dv as () => unknown)();
    } else if (Reference.isReference(dv)) {
      resolved = dv.resolve();
    } else {
      resolved = dv;
    }
    return isPlainObject(resolved) ? (resolved as Record<string, unknown>) : undefined;
  }

  public addLazyRegistryEntries(map: Map<string, unknown>): void {
    const id = this.typeOptions.meta?.id;
    if (id) {
      const prior = map.get(id);
      if (prior !== undefined && prior !== this) {
        throw new Error(`Cannot add different schemas with the same id`);
      }
      map.set(id, this);
    }
    for (const p of Object.values(this.props)) {
      p.addLazyRegistryEntries(map);
    }
  }

  public extends<NP extends NullableProps>(
    newProps: NP,
    newOptions?: ExtendedObjectTypeOptions<P, NP>
  ): ExtendedObjectType<P, NP> {
    const extendedProps = Object.entries({
      ...this.props,
      ...newProps,
    }).reduce((memo, [key, value]) => {
      if (value !== null && value !== undefined) {
        (memo as Record<string, unknown>)[key] = value;
      }
      return memo;
    }, {} as ExtendedProps<P, NP>);

    const extendedOptions = {
      ...this.typeOptions,
      unknowns: this.unknownsSetting,
      ...newOptions,
    } as ExtendedObjectTypeOptions<P, NP>;

    return new ObjectType(extendedProps, extendedOptions);
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    const extendedProps = Object.entries(this.props).reduce((memo, [key, value]) => {
      if (value !== null && value !== undefined) {
        return {
          ...memo,
          [key]: value.extendsDeep(options),
        };
      }
      return memo;
    }, {} as P);

    const extendedOptions: ObjectTypeOptions<P> = {
      ...this.typeOptions,
      unknowns: this.unknownsSetting,
      ...(options.unknowns !== undefined ? { unknowns: options.unknowns } : {}),
    };

    return new ObjectType(extendedProps, extendedOptions);
  }

  protected validateWithFrame(
    _frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    context: Record<string, unknown>,
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): ObjectResultType<P> {
    const policy = effectiveUnknowns(this.unknownsSetting, validationOptions?.stripUnknownKeys);
    const childValidationOptions: SchemaValidationOptions = {
      ...(validationOptions ?? {}),
      stripUnknownKeys: policy === 'ignore',
    };

    let val: any = value;
    if (typeof val === 'string') {
      try {
        val = JSON.parse(val);
      } catch {
        throw new ValidationError(
          new SchemaTypeError('could not parse object value from json input', []),
          namespace
        );
      }
    }

    if (val === undefined) {
      val = {};
    }

    const objectDefaults = this.resolveObjectLevelDefaults();
    if (objectDefaults !== undefined) {
      val = { ...objectDefaults, ...(val as Record<string, unknown>) };
    }

    if (!isPlainObject(val)) {
      if (Array.isArray(val)) {
        throw new ValidationError(
          new SchemaTypeError(`expected a plain object value, but found [Array] instead.`, []),
          namespace
        );
      }
      throw new ValidationError(
        new SchemaTypeError(
          `expected a plain object value, but found [${typeDetect(val)}] instead.`,
          []
        ),
        namespace
      );
    }

    const src = val as Record<string, unknown>;

    if (policy === 'forbid') {
      for (const key of Object.keys(src)) {
        if (!(key in this.props)) {
          throw new ValidationError(
            new SchemaTypeError(`Additional properties are not allowed ('${key}' was unexpected)`, [
              key,
            ]),
            namespace
          );
        }
      }
    }

    const output: Record<string, unknown> = {};
    const frame = getValidationFrame();
    // Validate keys in deterministic order so sibling defaults (e.g. `sibling` before `value`) resolve
    // when defaults reference other keys in the same object.
    const keys = Object.keys(this.props).sort((a, b) => a.localeCompare(b));

    for (const key of keys) {
      const propType = this.props[key];
      const raw = src[key];
      const siblingView: Record<string, unknown> = { ...src, ...output };
      if (frame) {
        const prev = frame.siblingRoot;
        frame.siblingRoot = siblingView;
        try {
          const validated = propType.validate(raw, context, undefined, childValidationOptions);
          if (!(propType instanceof NeverType && raw === undefined)) {
            output[key] = validated;
          }
        } catch (e) {
          if (e instanceof ValidationError && e.cause instanceof SchemaTypeError) {
            throw new ValidationError(prependPropertyKey(key, e.cause), namespace);
          }
          throw e;
        } finally {
          frame.siblingRoot = prev;
        }
      } else {
        const validated = propType.validate(raw, context, undefined, childValidationOptions);
        if (!(propType instanceof NeverType && raw === undefined)) {
          output[key] = validated;
        }
      }
    }

    if (policy === 'allow') {
      for (const key of Object.keys(src)) {
        if (!(key in output)) {
          output[key] = src[key];
        }
      }
    }

    const rootValidate = this.typeOptions.validate;
    if (rootValidate) {
      let msg: string | void;
      try {
        msg = rootValidate(output as ObjectResultType<P>);
      } catch (e: any) {
        msg = e?.message ?? String(e);
      }
      if (typeof msg === 'string') {
        throw new ValidationError(new SchemaTypeError(msg, []), namespace);
      }
    }

    return output as ObjectResultType<P>;
  }

  protected handleError(type: string, { reason, value, child }: Record<string, any>) {
    switch (type) {
      case 'any.required':
      case 'object.base':
        return `expected a plain object value, but found [${typeDetect(value)}] instead.`;
      case 'object.parse':
        return `could not parse object value from json input`;
      case 'object.unknown':
        return child
          ? `Additional properties are not allowed ('${child}' was unexpected)`
          : `Additional properties are not allowed (an unexpected property was found)`;
      case 'object.child':
        return reason[0];
    }
  }

  public getPropSchemas(): P {
    return { ...this.props };
  }

  public getSchemaStructure() {
    const entries: import('./interfaces').SchemaStructureEntry[] = [];
    for (const key of Object.keys(this.props)) {
      const child = this.props[key];
      for (const e of child.getSchemaStructure()) {
        entries.push({ path: [key, ...e.path], type: e.type });
      }
    }
    return entries;
  }

  validateKey(key: string, value: any, context: Record<string, unknown> = {}) {
    if (!this.props[key]) {
      throw new Error(`${key} is not a valid part of this schema`);
    }
    return this.props[key].validate(value, context);
  }

  protected structureTypeLabel(): string {
    return 'object';
  }
}
