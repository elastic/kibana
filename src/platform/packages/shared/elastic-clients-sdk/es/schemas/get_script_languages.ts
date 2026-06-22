/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-nocheck

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

/**
 * We are still working on this type, it will arrive soon.
 * If it's critical for you, please open an issue.
 * https://github.com/elastic/elasticsearch-specification
 */
export const TODO = z.record(z.string(), z.any())
export type TODO = z.infer<typeof TODO>

export const ScriptLanguage = z.union([z.enum(['painless', 'expression', 'mustache', 'java']), z.string()]).meta({ id: 'ScriptLanguage' })
export type ScriptLanguage = z.infer<typeof ScriptLanguage>

export const GetScriptLanguagesLanguageContext = z.object({
  contexts: z.array(z.string()),
  language: ScriptLanguage
}).meta({ id: 'GetScriptLanguagesLanguageContext' })
export type GetScriptLanguagesLanguageContext = z.infer<typeof GetScriptLanguagesLanguageContext>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Get script languages.
 *
 * Get a list of available script types, languages, and contexts.
 */
export const GetScriptLanguagesRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'GetScriptLanguagesRequest' })
export type GetScriptLanguagesRequest = z.infer<typeof GetScriptLanguagesRequest>

export const GetScriptLanguagesResponse = z.object({
  language_contexts: z.array(GetScriptLanguagesLanguageContext),
  types_allowed: z.array(z.string())
}).meta({ id: 'GetScriptLanguagesResponse' })
export type GetScriptLanguagesResponse = z.infer<typeof GetScriptLanguagesResponse>
