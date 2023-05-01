/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import z from 'zod';
import { internals } from '../internals';
import { Type, TypeOptions } from './type';
import { ValidationError } from '../errors';

export type Props = Record<string, Type<any>>;

export type NullableProps = Record<string, Type<any> | undefined | null>;

export type TypeOf<RT extends Type<any>> = RT['type'];

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

// Because of https://github.com/Microsoft/TypeScript/issues/14041
// this might not have perfect _rendering_ output, but it will be typed.
export type ObjectResultType<P extends Props> = Readonly<
  { [K in keyof OptionalProperties<P>]?: TypeOf<P[K]> } & {
    [K in keyof RequiredProperties<P>]: TypeOf<P[K]>;
  }
>;

interface UnknownOptions {
  /**
   * Options for dealing with unknown keys:
   * - allow: unknown keys will be permitted
   * - ignore: unknown keys will not fail validation, but will be stripped out
   * - forbid (default): unknown keys will fail validation
   */
  unknowns?: 'allow' | 'ignore' | 'forbid';
}

export type ObjectTypeOptions<P extends Props = any> = TypeOptions<ObjectResultType<P>> &
  UnknownOptions;

const errorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.unrecognized_keys) {
    if (issue.keys.length === 1) {
      return {
        message: `definition for [${issue.keys[0]}] key is missing`,
      };
    }
    return { message: `definition for these keys is missing: [${issue.keys.join(', ')}]` };
  }
  return { message: ctx.defaultError };
};

export class ObjectType<P extends Props = any> extends Type<ObjectResultType<P>> {
  private propSchemas: Record<string, z.ZodTypeAny>;

  constructor(props: P, options: ObjectTypeOptions<P> = {}) {
    const schemaKeys = {} as Record<string, z.ZodTypeAny>;
    const { unknowns = 'forbid', ...typeOptions } = options;
    for (const [key, value] of Object.entries(props)) {
      schemaKeys[key] = value.getSchema();
    }
    let schema = internals.object(schemaKeys, { errorMap }).strict();
    if (unknowns === 'allow') {
      schema = schema.passthrough() as unknown as z.ZodObject<any, 'strict'>;
    } else if (unknowns === 'ignore') {
      schema = schema.strip() as unknown as z.ZodObject<any, 'strict'>;
    }

    super(schema, typeOptions);
    this.propSchemas = schemaKeys;
  }

  validateKey(key: string, value: any) {
    if (!this.propSchemas[key]) {
      throw new Error(`${key} is not a valid part of this schema`);
    }
    const result = this.propSchemas[key].safeParse(value);
    if (!result.success) {
      throw new ValidationError(result.error.errors[0] as any, key);
    }
    return result.data;
  }
}
