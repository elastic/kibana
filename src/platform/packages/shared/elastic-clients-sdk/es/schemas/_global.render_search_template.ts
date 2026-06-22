/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { ScriptSource } from './_global.search'
import { Id, RequestBase } from './_types'

/**
 * Render a search template.
 *
 * Render a search template as a search request body.
 */
export const RenderSearchTemplateRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The ID of the search template to render. If no `source` is specified, this or the `id` request body parameter is required.').optional().meta({ found_in: 'path' }),
  file: z.string().optional().meta({ found_in: 'body' }),
  params: z.record(z.string(), z.any()).describe('Key-value pairs used to replace Mustache variables in the template. The key is the variable name. The value is the variable value.').optional().meta({ found_in: 'body' }),
  source: z.lazy(() => ScriptSource).describe('An inline search template. It supports the same parameters as the search API\'s request body. These parameters also support Mustache variables. If no `id` or `<templated-id>` is specified, this parameter is required.').optional().meta({ found_in: 'body' })
}).meta({ id: 'RenderSearchTemplateRequest' })
export type RenderSearchTemplateRequest = z.infer<typeof RenderSearchTemplateRequest>

export const RenderSearchTemplateResponse = z.object({
  template_output: z.record(z.string(), z.any())
}).meta({ id: 'RenderSearchTemplateResponse' })
export type RenderSearchTemplateResponse = z.infer<typeof RenderSearchTemplateResponse>
