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

export const Name = z.string().meta({ id: 'Name' })
export type Name = z.infer<typeof Name>

export const GetScriptContextContextMethodParam = z.object({
  name: Name,
  type: z.string()
}).meta({ id: 'GetScriptContextContextMethodParam' })
export type GetScriptContextContextMethodParam = z.infer<typeof GetScriptContextContextMethodParam>

export const GetScriptContextContextMethod = z.object({
  name: Name,
  return_type: z.string(),
  params: z.array(GetScriptContextContextMethodParam)
}).meta({ id: 'GetScriptContextContextMethod' })
export type GetScriptContextContextMethod = z.infer<typeof GetScriptContextContextMethod>

export const GetScriptContextContext = z.object({
  methods: z.array(GetScriptContextContextMethod),
  name: Name
}).meta({ id: 'GetScriptContextContext' })
export type GetScriptContextContext = z.infer<typeof GetScriptContextContext>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Get script contexts.
 *
 * Get a list of supported script contexts and their methods.
 */
export const GetScriptContextRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'GetScriptContextRequest' })
export type GetScriptContextRequest = z.infer<typeof GetScriptContextRequest>

export const GetScriptContextResponse = z.object({
  contexts: z.array(GetScriptContextContext)
}).meta({ id: 'GetScriptContextResponse' })
export type GetScriptContextResponse = z.infer<typeof GetScriptContextResponse>
