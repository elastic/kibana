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

export type MapOfOptions<K, V> = TypeOptions<Map<K, V>> & UnknownOptions;

export class MapOfType<K, V> extends Type<Map<K, V>> {
  private readonly keyType: Type<K>;
  private readonly valueType: Type<V>;
  private readonly mapOptions: MapOfOptions<K, V>;

  constructor(keyType: Type<K>, valueType: Type<V>, options: MapOfOptions<K, V> = {}) {
    const defaultValue = options.defaultValue;
    const metaSchema = zod.any().meta({
      [META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES]: () => valueType.getSchema(),
    });

    super(metaSchema, {
      ...options,
      defaultValue: defaultValue instanceof Map ? () => defaultValue : defaultValue,
    });
    this.keyType = keyType;
    this.valueType = valueType;
    this.mapOptions = options;
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    return new MapOfType(
      this.keyType.extendsDeep(options),
      this.valueType.extendsDeep(options),
      this.mapOptions
    );
  }

  protected validateWithFrame(
    _frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    context: Record<string, unknown>,
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): Map<K, V> {
    if (value === undefined && this.typeOptions.defaultValue !== undefined) {
      const def = this.typeOptions.defaultValue;
      let resolved: unknown;
      if (typeof def === 'function') {
        resolved = def();
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
          new SchemaTypeError('could not parse map value from json input', []),
          namespace
        );
      }
    }

    let entries: Array<[unknown, unknown]>;
    if (val instanceof Map) {
      entries = [...val.entries()];
    } else if (isPlainObject(val)) {
      entries = Object.entries(val as Record<string, unknown>);
    } else {
      if (Array.isArray(val)) {
        throw new ValidationError(
          new SchemaTypeError(`expected value of type [Map] or [object] but got [Array]`, []),
          namespace
        );
      }
      throw new ValidationError(
        new SchemaTypeError(
          `expected value of type [Map] or [object] but got [${typeDetect(val)}]`,
          []
        ),
        namespace
      );
    }

    const policy = effectiveUnknowns(this.mapOptions.unknowns, validationOptions?.stripUnknownKeys);
    const childValidationOptions: SchemaValidationOptions = {
      ...(validationOptions ?? {}),
      stripUnknownKeys: policy === 'ignore',
    };

    const result = new Map<K, V>();

    for (const [rawKey, entryVal] of entries) {
      let mappedKey: K;
      try {
        mappedKey = this.keyType.validate(rawKey, context, undefined, validationOptions) as K;
      } catch (e) {
        const cause = unwrapValidationError(e);
        if (cause) {
          const pathPrefix = [`key("${String(rawKey)}")`, ...cause.path];
          const wrapped =
            cause instanceof SchemaTypesError
              ? new SchemaTypesError(cause.message, pathPrefix, cause.errors)
              : new SchemaTypeError(cause.message, pathPrefix);
          throw new ValidationError(wrapped, namespace);
        }
        throw e;
      }

      try {
        const mappedVal = this.valueType.validate(
          entryVal,
          context,
          undefined,
          childValidationOptions
        ) as V;
        result.set(mappedKey, mappedVal);
      } catch (e) {
        const cause = unwrapValidationError(e);
        if (cause) {
          throw new ValidationError(prependPropertyKey(String(rawKey), cause), namespace);
        }
        throw e;
      }
    }

    const rootValidate = this.typeOptions.validate;
    if (rootValidate) {
      let msg: string | void;
      try {
        msg = rootValidate(result);
      } catch (e: unknown) {
        msg = e instanceof Error ? e.message : String(e);
      }
      if (typeof msg === 'string') {
        throw new ValidationError(new SchemaTypeError(msg, []), namespace);
      }
    }

    return result;
  }

  protected structureTypeLabel(): string {
    return 'map';
  }
}
