/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import type { $ZodRawIssue } from '@kbn/zod';

import { SchemaTypeError, ValidationError } from '../errors';
import {
  getValidationFrame,
  runWithValidationFrame,
  type ValidationFrame,
} from '../validation_frame';
import type {
  ExtendsDeepOptions,
  SchemaStructureEntry,
  SchemaValidationOptions,
  TypeOptions,
} from './interfaces';
import { wrapWithTypeOptions } from './wrap_schema';

export type {
  ExtendsDeepOptions,
  OptionsForUnknowns,
  SchemaStructureEntry,
  SchemaValidationOptions,
  TypeMeta,
  TypeMetaAvailability,
  TypeOptions,
  TypeOptionsValidate,
  UnknownOptions,
} from './interfaces';

/**
 * @deprecated Inline `superRefine` / refinements on Zod schemas instead.
 */
export const convertValidationFunction = <T = unknown>(validate: (value: T) => string | void) => {
  return (val: T, ctx: { addIssue: (i: string | $ZodRawIssue) => void }) => {
    let msg: string | void;
    try {
      msg = validate(val);
    } catch (e: any) {
      msg = e?.message ?? String(e);
    }
    if (typeof msg === 'string') {
      ctx.addIssue({ code: 'custom', message: msg, input: val } as $ZodRawIssue);
    }
  };
};

export abstract class Type<V> {
  public readonly type: V = null! as V;

  public readonly __isKbnConfigSchemaType = true;

  protected readonly internalSchema: z.ZodType<V>;

  protected readonly typeOptions: TypeOptions<V>;

  protected constructor(schema: z.ZodTypeAny, options: TypeOptions<V> = {}) {
    this.typeOptions = options;
    this.internalSchema = wrapWithTypeOptions(schema, options) as z.ZodType<V>;
  }

  public extendsDeep(_newOptions: ExtendsDeepOptions): Type<V> {
    return this;
  }

  public validate(
    value: unknown,
    context: Record<string, unknown> = {},
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): V {
    const existingFrame = getValidationFrame();
    if (existingFrame) {
      return this.validateWithFrame(existingFrame, value, context, namespace, validationOptions);
    }

    const lazyRegistry = this.buildLazyRegistry();
    const frame: ValidationFrame = {
      context,
      siblingRoot: undefined,
      lazyRegistry,
    };

    return runWithValidationFrame(frame, () =>
      this.validateWithFrame(frame, value, context, namespace, validationOptions)
    );
  }

  protected validateWithFrame(
    _frame: ValidationFrame,
    value: unknown,
    _context: Record<string, unknown>,
    namespace?: string,
    _validationOptions?: SchemaValidationOptions
  ): V {
    const result = this.internalSchema.safeParse(value, { reportInput: true });
    if (!result.success) {
      throw new ValidationError(this.zodErrorToSchemaError(result.error), namespace);
    }
    return result.data;
  }

  /** Whether this type declares `defaultValue` in its options (used by ConditionalType default layering). */
  public hasOwnDefaultValue(): boolean {
    return this.typeOptions.defaultValue !== undefined;
  }

  public getSchema(): z.ZodType<V> {
    return this.internalSchema;
  }

  public getSchemaStructure(): SchemaStructureEntry[] {
    return [{ path: [], type: this.structureTypeLabel() }];
  }

  public getStructureLabel(): string {
    return this.structureTypeLabel();
  }

  protected structureTypeLabel(): string {
    return 'unknown';
  }

  protected buildLazyRegistry(): Map<string, unknown> {
    const map = new Map<string, unknown>();
    this.addLazyRegistryEntries(map);
    return map;
  }

  public addLazyRegistryEntries(_map: Map<string, unknown>): void {}

  protected handleError(
    _type: string,
    _context: Record<string, any>,
    _path: string[]
  ): string | SchemaTypeError | void {
    return undefined;
  }

  protected zodErrorToSchemaError(error: z.ZodError): SchemaTypeError {
    const issue = error.issues[0];
    const path = (issue?.path ?? []).map((p) => String(p));
    const inv = issue as z.ZodIssue & {
      input?: unknown;
      message?: string;
      params?: Record<string, unknown>;
    };
    const pseudoContext: Record<string, any> = {
      value: inv.input,
      ...(inv.params ?? {}),
      message: inv.message,
    };

    if (issue?.code === 'custom') {
      const customHandled = this.handleError('custom', pseudoContext, path);
      if (customHandled instanceof SchemaTypeError) {
        return customHandled;
      }
      if (typeof customHandled === 'string') {
        return new SchemaTypeError(customHandled, path);
      }
      return new SchemaTypeError(String(issue?.message ?? 'Validation failed'), path);
    }

    const mappedCode = mapZodIssueCode(issue);
    const handled = this.handleError(mappedCode, pseudoContext, path);
    if (handled instanceof SchemaTypeError) {
      return handled;
    }
    if (typeof handled === 'string') {
      return new SchemaTypeError(handled, path);
    }

    return new SchemaTypeError(issue?.message ?? 'Validation failed', path);
  }
}

function mapZodIssueCode(issue: z.ZodIssue | undefined): string {
  if (!issue) {
    return 'unknown';
  }
  switch (issue.code) {
    case 'invalid_type': {
      const inv = issue as z.ZodIssue & { input?: unknown };
      // Zod v4 omits `received`; missing required values surface as invalid_type with input === undefined
      if ('input' in inv && inv.input === undefined) {
        return 'any.required';
      }
      return 'invalid_type';
    }
    default:
      return issue.code;
  }
}
