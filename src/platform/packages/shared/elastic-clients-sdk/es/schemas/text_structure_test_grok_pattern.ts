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

export const GrokPattern = z.string().meta({ id: 'GrokPattern' })
export type GrokPattern = z.infer<typeof GrokPattern>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const TextStructureTestGrokPatternMatchedField = z.object({
  match: z.string(),
  offset: integer,
  length: integer
}).meta({ id: 'TextStructureTestGrokPatternMatchedField' })
export type TextStructureTestGrokPatternMatchedField = z.infer<typeof TextStructureTestGrokPatternMatchedField>

export const TextStructureTestGrokPatternMatchedText = z.object({
  matched: z.boolean(),
  fields: z.record(z.string(), z.array(TextStructureTestGrokPatternMatchedField)).optional()
}).meta({ id: 'TextStructureTestGrokPatternMatchedText' })
export type TextStructureTestGrokPatternMatchedText = z.infer<typeof TextStructureTestGrokPatternMatchedText>

/**
 * Test a Grok pattern.
 *
 * Test a Grok pattern on one or more lines of text.
 * The API indicates whether the lines match the pattern together with the offsets and lengths of the matched substrings.
 */
export const TextStructureTestGrokPatternRequest = z.object({
  ...RequestBase.shape,
  ecs_compatibility: z.string().describe('The mode of compatibility with ECS compliant Grok patterns. Use this parameter to specify whether to use ECS Grok patterns instead of legacy ones when the structure finder creates a Grok pattern. Valid values are `disabled` and `v1`.').optional().meta({ found_in: 'query' }),
  grok_pattern: GrokPattern.describe('The Grok pattern to run on the text.').meta({ found_in: 'body' }),
  text: z.array(z.string()).describe('The lines of text to run the Grok pattern on.').meta({ found_in: 'body' })
}).meta({ id: 'TextStructureTestGrokPatternRequest' })
export type TextStructureTestGrokPatternRequest = z.infer<typeof TextStructureTestGrokPatternRequest>

export const TextStructureTestGrokPatternResponse = z.object({
  matches: z.array(TextStructureTestGrokPatternMatchedText)
}).meta({ id: 'TextStructureTestGrokPatternResponse' })
export type TextStructureTestGrokPatternResponse = z.infer<typeof TextStructureTestGrokPatternResponse>
