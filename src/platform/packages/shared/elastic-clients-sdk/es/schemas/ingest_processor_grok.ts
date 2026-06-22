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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Run a grok processor.
 *
 * Extract structured fields out of a single text field within a document.
 * You must choose which field to extract matched fields from, as well as the grok pattern you expect will match.
 * A grok pattern is like a regular expression that supports aliased expressions that can be reused.
 */
export const IngestProcessorGrokRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'IngestProcessorGrokRequest' })
export type IngestProcessorGrokRequest = z.infer<typeof IngestProcessorGrokRequest>

export const IngestProcessorGrokResponse = z.object({
  patterns: z.record(z.string(), z.string())
}).meta({ id: 'IngestProcessorGrokResponse' })
export type IngestProcessorGrokResponse = z.infer<typeof IngestProcessorGrokResponse>
