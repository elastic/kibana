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
import { z as zod } from '@kbn/zod';

import { SchemaTypeError, SchemaTypesError, ValidationError } from '../errors';
import { Reference } from '../references';
import { META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES } from '../oas_meta_fields';
import { prependPropertyKey, unwrapValidationError } from './error_utils';
import type { ExtendsDeepOptions, SchemaValidationOptions, UnknownOptions } from './interfaces';
import { effectiveUnknowns } from './object_helpers';
import type { TypeOptions } from './type';
import { Type } from './type';

export type RecordOfOptions<K extends string, V> = TypeOptions<Record<K, V>> & UnknownOptions;

export class RecordOfType<K extends string, V> extends Type<Record<K, V>> {
  private readonly keyType: Type<K>;
  private readonly valueType: Type<V>;
  private readonly recordOptions: RecordOfOptions<K, V>;

  constructor(keyType: Type<K>, valueType: Type<V>, options: RecordOfOptions<K, V> = {}) {
    const metaSchema = zod.any().meta({
      [META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES]: () => valueType.getSchema(),
    });

    super(metaSchema, options);
    this.keyType = keyType;
    this.valueType = valueType;
    this.recordOptions = options;
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    return new RecordOfType(
      this.keyType.extendsDeep(options),
      this.valueType.extendsDeep(options),
      this.recordOptions
    );
  }

  protected validateWithFrame(
    _frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    context: Record<string, unknown>,
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): Record<K, V> {
    if (value === undefined && this.typeOptions.defaultValue !== undefined) {
      const def = this.typeOptions.defaultValue;
      let resolved: unknown;
      if (typeof def === 'function') {
        resolved = (def as () => unknown)();
      } else if (Reference.isReference(def)) {
        resolved = def.resolve();
      } else {
        resolved = def;
      }
      return this.validateWithFrame(_frame, resolved, context, namespace, validationOptions);
    }

    let val: unknown = value;
    if (typeof val === 'string') {
      try {
        val = JSON.parse(val);
      } catch {
        throw new ValidationError(
          new SchemaTypeError('could not parse record value from json input', []),
          namespace
        );
      }
    }

    if (!isPlainObject(val)) {
      if (Array.isArray(val)) {
        throw new ValidationError(
          new SchemaTypeError(`expected value of type [object] but got [Array]`, []),
          namespace
        );
      }
      throw new ValidationError(
        new SchemaTypeError(`expected value of type [object] but got [${typeDetect(val)}]`, []),
        namespace
      );
    }

    const policy = effectiveUnknowns(
      this.recordOptions.unknowns,
      validationOptions?.stripUnknownKeys
    );
    const childValidationOptions: SchemaValidationOptions = {
      ...(validationOptions ?? {}),
      stripUnknownKeys: policy === 'ignore',
    };

    const src = val as Record<string, unknown>;
    const output = {} as Record<K, V>;

    for (const entryKey of Object.keys(src)) {
      const rawKey = entryKey as K;
      const entryVal = src[entryKey];

      try {
        this.keyType.validate(rawKey, context, undefined, validationOptions);
      } catch (e) {
        const cause = unwrapValidationError(e);
        if (cause) {
          const pathPrefix = [`key("${String(entryKey)}")`, ...cause.path];
          const wrapped =
            cause instanceof SchemaTypesError
              ? new SchemaTypesError(cause.message, pathPrefix, cause.errors)
              : new SchemaTypeError(cause.message, pathPrefix);
          throw new ValidationError(wrapped, namespace);
        }
        throw e;
      }

      try {
        (output as Record<string, unknown>)[entryKey] = this.valueType.validate(
          entryVal,
          context,
          undefined,
          childValidationOptions
        );
      } catch (e) {
        const cause = unwrapValidationError(e);
        if (cause) {
          throw new ValidationError(prependPropertyKey(String(entryKey), cause), namespace);
        }
        throw e;
      }
    }

    const rootValidate = this.typeOptions.validate;
    if (rootValidate) {
      let msg: string | void;
      try {
        msg = rootValidate(output as Record<K, V>);
      } catch (e: unknown) {
        msg = e instanceof Error ? e.message : String(e);
      }
      if (typeof msg === 'string') {
        throw new ValidationError(new SchemaTypeError(msg, []), namespace);
      }
    }

    return output;
  }

  protected structureTypeLabel(): string {
    return 'record';
  }
}
