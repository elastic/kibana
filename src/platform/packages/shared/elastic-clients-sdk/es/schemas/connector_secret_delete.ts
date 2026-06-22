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

/** Deletes a connector secret. */
export const ConnectorSecretDeleteRequest = z.object({
  ...RequestBase.shape,
  id: z.string().describe('The ID of the secret').meta({ found_in: 'path' })
}).meta({ id: 'ConnectorSecretDeleteRequest' })
export type ConnectorSecretDeleteRequest = z.infer<typeof ConnectorSecretDeleteRequest>

export const ConnectorSecretDeleteResponse = z.object({
  deleted: z.boolean()
}).meta({ id: 'ConnectorSecretDeleteResponse' })
export type ConnectorSecretDeleteResponse = z.infer<typeof ConnectorSecretDeleteResponse>
