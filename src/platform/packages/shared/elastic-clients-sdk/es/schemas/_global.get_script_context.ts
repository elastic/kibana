/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Name, RequestBase } from './_types'

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
