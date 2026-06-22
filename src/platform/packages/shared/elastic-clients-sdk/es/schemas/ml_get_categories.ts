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

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const CategoryId = long.meta({ id: 'CategoryId' })
export type CategoryId = z.infer<typeof CategoryId>

export const GrokPattern = z.string().meta({ id: 'GrokPattern' })
export type GrokPattern = z.infer<typeof GrokPattern>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const ulong = z.number().meta({ id: 'ulong' })
export type ulong = z.infer<typeof ulong>

export const MlCategory = z.object({
  category_id: ulong.describe('A unique identifier for the category. category_id is unique at the job level, even when per-partition categorization is enabled.'),
  examples: z.array(z.string()).describe('A list of examples of actual values that matched the category.'),
  grok_pattern: GrokPattern.describe('[experimental] A Grok pattern that could be used in Logstash or an ingest pipeline to extract fields from messages that match the category. This field is experimental and may be changed or removed in a future release. The Grok patterns that are found are not optimal, but are often a good starting point for manual tweaking.').optional(),
  job_id: Id.describe('Identifier for the anomaly detection job.'),
  max_matching_length: ulong.describe('The maximum length of the fields that matched the category. The value is increased by 10% to enable matching for similar fields that have not been analyzed.'),
  partition_field_name: z.string().describe('If per-partition categorization is enabled, this property identifies the field used to segment the categorization. It is not present when per-partition categorization is disabled.').optional(),
  partition_field_value: z.string().describe('If per-partition categorization is enabled, this property identifies the value of the partition_field_name for the category. It is not present when per-partition categorization is disabled.').optional(),
  regex: z.string().describe('A regular expression that is used to search for values that match the category.'),
  terms: z.string().describe('A space separated list of the common tokens that are matched in values of the category.'),
  num_matches: long.describe('The number of messages that have been matched by this category. This is only guaranteed to have the latest accurate count after a job _flush or _close').optional(),
  preferred_to_categories: z.array(Id).describe('A list of category_id entries that this current category encompasses. Any new message that is processed by the categorizer will match against this category and not any of the categories in this list. This is only guaranteed to have the latest accurate list of categories after a job _flush or _close').optional(),
  p: z.string().optional(),
  result_type: z.string(),
  mlcategory: z.string()
}).meta({ id: 'MlCategory' })
export type MlCategory = z.infer<typeof MlCategory>

export const MlPage = z.object({
  from: integer.describe('Skips the specified number of items.').optional(),
  size: integer.describe('Specifies the maximum number of items to obtain.').optional()
}).meta({ id: 'MlPage' })
export type MlPage = z.infer<typeof MlPage>

/** Get anomaly detection job results for categories. */
export const MlGetCategoriesRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  category_id: CategoryId.describe('Identifier for the category, which is unique in the job. If you specify neither the category ID nor the partition_field_value, the API returns information about all categories. If you specify only the partition_field_value, it returns information about all categories for the specified partition.').optional().meta({ found_in: 'path' }),
  from: integer.describe('Skips the specified number of categories.').optional().meta({ found_in: 'query' }),
  partition_field_value: z.string().describe('Only return categories for the specified partition.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of categories to obtain.').optional().meta({ found_in: 'query' }),
  page: MlPage.describe('Configures pagination. This parameter has the `from` and `size` properties.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlGetCategoriesRequest' })
export type MlGetCategoriesRequest = z.infer<typeof MlGetCategoriesRequest>

export const MlGetCategoriesResponse = z.object({
  categories: z.array(MlCategory),
  count: long
}).meta({ id: 'MlGetCategoriesResponse' })
export type MlGetCategoriesResponse = z.infer<typeof MlGetCategoriesResponse>
