/**
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod'
import type { SchemaArgDefinition } from './schema-args'
import { simplifyZodIssues } from './zod-error'

/**
 * Result of a successful input validation pass.
 */
export interface ValidateInputSuccess {
  ok: true
  data: unknown
}

/**
 * Result of a failed input validation pass.
 */
export interface ValidateInputFailure {
  ok: false
  issues: ReturnType<typeof simplifyZodIssues>
}

export type ValidateInputResult = ValidateInputSuccess | ValidateInputFailure

/**
 * Validates `inputValue` against `schema` using the same rules as the CLI factory:
 *
 * 1. Apply `.passthrough()` when the schema is a `ZodObject` without an explicit
 *    catchall, so unknown fields (newer ES versions, plugins) flow through to the
 *    server instead of being rejected client-side.
 * 2. Relax object/array body fields to `z.any()` — the full DSL is too complex for
 *    client-side schemas; server-side validation handles semantic correctness.
 * 3. Call `safeParse` and return a discriminated `{ ok, data }` / `{ ok, issues }` result.
 */
export function validateInput (
  schema: z.ZodType,
  inputValue: unknown,
  schemaArgs: SchemaArgDefinition[],
): ValidateInputResult {
  let validationSchema: z.ZodType = (
    schema instanceof z.ZodObject &&
    (schema.def as unknown as { catchall?: { type: string } }).catchall?.type !== 'unknown'
  )
    ? schema.passthrough()
    : schema

  const jsonBodyFields = schemaArgs.filter(
    a => (a.type === 'object' || a.type === 'array') && a.foundIn === 'body'
  )
  if (jsonBodyFields.length > 0 && validationSchema instanceof z.ZodObject) {
    const overrides: Record<string, z.ZodType> = {}
    for (const f of jsonBodyFields) {
      overrides[f.schemaKey] = z.any()
    }
    validationSchema = (validationSchema as z.ZodObject<z.ZodRawShape>).extend(overrides)
  }

  const result = validationSchema.safeParse(inputValue)
  if (result.success) {
    return { ok: true, data: result.data }
  }
  return { ok: false, issues: simplifyZodIssues(result.error.issues) }
}
