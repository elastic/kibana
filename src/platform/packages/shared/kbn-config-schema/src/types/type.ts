/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isSchema,
  type CustomValidator,
  type ErrorReport,
  type Schema,
  type SchemaLike,
  type WhenOptions,
  CustomHelpers,
} from 'joi';
import { META_FIELD_X_OAS_DEPRECATED, META_FIELD_X_OAS_DISCONTINUED } from '../oas_meta_fields';
import { SchemaTypeError, ValidationError } from '../errors';
import { Reference } from '../references';

/**
 * Meta fields used when introspecting runtime validation. Most notably for
 * generating OpenAPI spec.
 */
export interface TypeMeta {
  /**
   * A human-friendly description of this type to be used in documentation.
   */
  description?: string;
  /**
   * Whether this field is deprecated.
   */
  deprecated?: boolean;
  /**
   * Release version or date that this route will be removed
   * @example 9.0.0
   */
  'x-discontinued'?: string;
}

export interface TypeOptions<T> {
  defaultValue?: T | Reference<T> | (() => T);
  validate?: (value: T) => string | void;
  meta?: TypeMeta;
}

export interface SchemaStructureEntry {
  path: string[];
  type: string;
}

export interface GetSchemaStructureOptions {
  /**
   * List the nested keys inside schemas with several branches (`schema.conditional`, `offeringBasedSchema`,
   * `schema.oneOf`, `schema.nullable`, `schema.discriminatedUnion`) instead of reporting them as a single leaf.
   */
  expandBranches?: boolean;
}

/**
 * Global validation Options to be provided when calling the `schema.validate()` method.
 */
export interface SchemaValidationOptions {
  /**
   * Remove unknown config keys
   */
  stripUnknownKeys?: boolean;
}

/**
 * Options for dealing with unknown keys:
 * - allow: unknown keys will be permitted
 * - ignore: unknown keys will not fail validation, but will be stripped out
 * - forbid (default): unknown keys will fail validation
 */
export type OptionsForUnknowns = 'allow' | 'ignore' | 'forbid';

export interface UnknownOptions {
  unknowns?: OptionsForUnknowns;
}

export interface ExtendsDeepOptions {
  unknowns?: OptionsForUnknowns;
}

export const convertValidationFunction = <T = unknown>(
  validate: (value: T) => string | void
): CustomValidator<T> => {
  return (value, { error }) => {
    let validationResultMessage;
    try {
      validationResultMessage = validate(value);
    } catch (e) {
      validationResultMessage = e.message || e;
    }

    if (typeof validationResultMessage === 'string') {
      return error('any.custom', { message: validationResultMessage });
    }

    return value;
  };
};

export abstract class Type<V> {
  // This is just to enable the `TypeOf` helper, and because TypeScript would
  // fail if it wasn't initialized we use a "trick" to which basically just
  // sets the value to `null` while still keeping the type.
  public readonly type: V = null! as V;

  // used for the `isConfigSchema` typeguard
  public readonly __isKbnConfigSchemaType = true;

  /**
   * Internal "schema" backed by Joi.
   * @type {Schema}
   */
  protected readonly internalSchema: Schema;

  protected constructor(schema: Schema, options: TypeOptions<V> = {}) {
    if (options.defaultValue !== undefined) {
      schema = schema.optional();

      // If default value is a function, then we must provide description for it.
      if (typeof options.defaultValue === 'function') {
        schema = schema.default(options.defaultValue);
      } else {
        schema = schema.default(
          Reference.isReference(options.defaultValue)
            ? options.defaultValue.getSchema()
            : (options.defaultValue as any)
        );
      }
    }

    if (options.validate) {
      schema = schema.custom(convertValidationFunction(options.validate));
    }

    if (options.meta) {
      if (options.meta.description) {
        schema = schema.description(options.meta.description);
      }
      if (options.meta.deprecated) {
        schema = schema.meta({ [META_FIELD_X_OAS_DEPRECATED]: true });
      }
      if (options.meta.deprecated && options.meta['x-discontinued'])
        schema = schema.meta({ [META_FIELD_X_OAS_DISCONTINUED]: options.meta['x-discontinued'] });
    }

    // Attach generic error handler only if it hasn't been attached yet since
    // only the last error handler is counted.
    if (schema.$_getFlag('error') === undefined) {
      schema = schema.error(([error]) => this.onError(error));
    }

    this.internalSchema = schema;
  }

  public extendsDeep(newOptions: ExtendsDeepOptions): Type<V> {
    return this;
  }

  /**
   * Validates the provided value against this schema.
   * If valid, the resulting output will be returned, otherwise an exception will be thrown.
   */
  public validate(
    value: unknown,
    context: Record<string, unknown> = {},
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): V {
    const { value: validatedValue, error } = this.internalSchema.validate(value, {
      context,
      presence: 'required',
      stripUnknown: { objects: validationOptions?.stripUnknownKeys === true },
    });

    if (error) {
      throw new ValidationError(error as any, namespace);
    }

    return validatedValue;
  }

  /**
   * @note intended for internal use, if you need to use this please contact
   *       the core team to discuss your use case.
   */
  public getSchema() {
    return this.internalSchema;
  }

  public getSchemaStructure(options: GetSchemaStructureOptions = {}) {
    return recursiveGetSchemaStructure(this.internalSchema, [], options);
  }

  protected handleError(
    type: string,
    context: Record<string, any>,
    path: string[]
  ): string | SchemaTypeError | void {
    return undefined;
  }

  private onError(error: SchemaTypeError | ErrorReport): SchemaTypeError {
    if (error instanceof SchemaTypeError) {
      return error;
    }

    const { local, code, path, value } = error;
    const convertedPath = path.map((entry) => entry.toString());
    const context: Record<string, any> = {
      ...local,
      value,
    };

    const errorHandleResult = this.handleError(code, context, convertedPath);
    if (errorHandleResult instanceof SchemaTypeError) {
      return errorHandleResult;
    }

    // If error handler just defines error message, then wrap it into proper
    // `SchemaTypeError` instance.
    if (typeof errorHandleResult === 'string') {
      return new SchemaTypeError(errorHandleResult, convertedPath);
    }

    // If error is produced by the custom validator, just extract source message
    // from context and wrap it into `SchemaTypeError` instance.
    if (code === 'any.custom' && context.message) {
      return new SchemaTypeError(context.message, convertedPath);
    }

    // `message` is only initialized once `toString` has been called (...)
    // see https://github.com/sideway/joi/blob/master/lib/errors.js
    const message = error.toString();
    return new SchemaTypeError(message || code, convertedPath);
  }
}

function recursiveGetSchemaStructure(
  internalSchema: Schema,
  path: string[],
  options: GetSchemaStructureOptions
): SchemaStructureEntry[] {
  const array: SchemaStructureEntry[] = [];
  // Note: we are relying on Joi internals to obtain the schema structure (recursive keys).
  // This is not ideal, but it works for now and we only need it for some integration test assertions.
  // If it breaks in the future, we'll need to update our tests.
  for (const [key, val] of (internalSchema as any)._ids._byKey.entries()) {
    array.push(...recursiveGetSchemaStructure(val.schema, [...path, key], options));
  }

  if (!array.length && options.expandBranches) {
    array.push(...getBranchesStructure(internalSchema, path, options));
  }

  if (!array.length) {
    let type: string;
    try {
      type = prettyPrintType(internalSchema, path);
    } catch (error) {
      // failed to find special type, might need to update for new joi versions or type usages
      type = internalSchema.type || 'unknown';
    }

    array.push({
      path,
      type,
    });
  }
  return array;
}

interface SchemaBranchTerm {
  schema?: SchemaLike;
  then?: SchemaLike;
  otherwise?: SchemaLike;
  switch?: SchemaBranchTerm[];
}

/**
 * Collects the branch schemas of `when` conditions (`schema.conditional`, `offeringBasedSchema`) and of
 * alternatives (`schema.oneOf`, `schema.nullable`, `schema.discriminatedUnion`).
 */
function getBranchSchemas(internalSchema: Schema): Schema[] {
  const terms = (internalSchema as any).$_terms ?? {};
  const branchTerms: SchemaBranchTerm[] = [...(terms.whens ?? []), ...(terms.matches ?? [])];
  const collect = ({
    schema,
    then,
    otherwise,
    switch: cases = [],
  }: SchemaBranchTerm): Array<SchemaLike | undefined> => [
    schema,
    then,
    otherwise,
    ...cases.flatMap(collect),
  ];
  return branchTerms.flatMap(collect).filter((branch): branch is Schema => isSchema(branch));
}

/** Whether a branch can contribute a value at its own path. */
function branchCanHoldValue(branch: Schema): boolean {
  const description = branch.describe();
  const flags = description.flags as { presence?: string; only?: boolean } | undefined;
  if (flags?.presence === 'forbidden') {
    return false;
  }
  if (flags?.only && description.allow?.length === 1 && description.allow[0] === null) {
    return false;
  }
  const branches = getBranchSchemas(branch);
  return branches.length === 0 || branches.some(branchCanHoldValue);
}

/**
 * Merges the nested keys of every branch of a conditional or alternatives schema.
 *
 * Returns an empty array when no branch has nested keys, so the caller falls back to a single leaf entry.
 * A key gets `never` added to its type when one of the branches cannot hold it. A branch that can hold a value at
 * the parent path (such as a record, or a nested branch schema with a scalar branch) adds its type to a single
 * parent entry, so it stays distinct from the nested keys. A `null` or `never` value holds nothing, so it only adds
 * `never` to the nested keys.
 */
function getBranchesStructure(
  internalSchema: Schema,
  path: string[],
  options: GetSchemaStructureOptions
): SchemaStructureEntry[] {
  const branches = getBranchSchemas(internalSchema);

  const nestedBranches: SchemaStructureEntry[][] = [];
  const parentTypes: string[] = [];
  let leafBranchCount = 0;
  for (const branch of branches) {
    const entries = recursiveGetSchemaStructure(branch, path, options);
    const nested = entries.filter((entry) => entry.path.length > path.length);
    const hasParentValue = branchCanHoldValue(branch);
    for (const entry of entries) {
      if (entry.path.length === path.length && hasParentValue) {
        parentTypes.push(...entry.type.split('|'));
      }
    }
    if (nested.length) {
      nestedBranches.push(nested);
    } else {
      leafBranchCount++;
    }
  }

  if (!nestedBranches.length) {
    return [];
  }

  // Keyed by the serialized segments, so a literal `a.b` key doesn't merge with the nested `a` -> `b` path.
  const typesByPath = new Map<string, { path: string[]; types: string[]; branchCount: number }>();
  for (const entries of nestedBranches) {
    for (const { path: entryPath, type } of entries) {
      const pathKey = JSON.stringify(entryPath);
      const existing = typesByPath.get(pathKey) ?? { path: entryPath, types: [], branchCount: 0 };
      existing.types.push(...type.split('|'));
      existing.branchCount++;
      typesByPath.set(pathKey, existing);
    }
  }

  const valueParentTypes = [...new Set(parentTypes)];
  const parentEntries: SchemaStructureEntry[] = valueParentTypes.length
    ? [{ path, type: valueParentTypes.join('|') }]
    : [];

  const nestedEntries = [...typesByPath.values()].map(({ path: entryPath, types, branchCount }) => {
    const isMissingFromBranch = branchCount < nestedBranches.length || leafBranchCount > 0;
    const allTypes = isMissingFromBranch ? [...types, 'never'] : types;
    return { path: entryPath, type: [...new Set(allTypes)].join('|') };
  });

  return [...parentEntries, ...nestedEntries];
}

/**
 * Returns a more accurate type from complex schema definitions.
 *
 * For example, conditional values resolve to type `any` when the nested value is only ever a `string`.
 *
 * @param internalSchema
 * @param path of current schema
 * @returns schema type
 */
function prettyPrintType(schema?: SchemaLike, path: string[] = []): string {
  // takes array of possible values and de-dups and joins
  return [...new Set([prettyPrintTypeParts(schema, false, path)].flat())].filter(Boolean).join('|');
}

/**
 * Recursively collects all possible nested schema types.
 */
function prettyPrintTypeParts(
  schema?: SchemaLike,
  optional = false,
  path: string[] = []
): string | string[] {
  if (!isSchema(schema)) {
    if (schema === null) return 'null';
    return `${String(schema ?? 'unknown')}${optional ? '?' : ''}`;
  }

  const isOptionalType = optional || schema._flags?.presence === 'optional';
  // For explicit custom schema.never
  if (schema._flags?.presence === 'forbidden') return 'never';
  // For offeringBasedSchema, schema.when, schema.conditional
  if (schema.$_terms?.whens?.length > 0)
    return (schema.$_terms.whens as WhenOptions[]).flatMap((when) =>
      [when?.then, when?.otherwise].flatMap((s) => prettyPrintTypeParts(s, isOptionalType, path))
    );
  // schema.oneOf, schema.allOf, etc.
  if (schema.$_terms?.matches?.length > 0)
    return (schema.$_terms.matches as CustomHelpers[]).flatMap((s) =>
      prettyPrintTypeParts(s.schema, isOptionalType, path)
    );
  // schema.literal
  if (schema._flags?.only && (schema as any)._valids?._values?.size > 0)
    return [...(schema as any)._valids._values.keys()].flatMap((v) =>
      prettyPrintTypeParts(v, isOptionalType, path)
    );

  return `${schema?.type || 'unknown'}${isOptionalType ? '?' : ''}`;
}
