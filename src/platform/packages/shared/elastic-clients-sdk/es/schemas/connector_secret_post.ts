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

/** Creates a secret for a Connector. */
export const ConnectorSecretPostRequest = z.object({
  ...RequestBase.shape,
  value: z.string().optional().meta({ found_in: 'body' })
}).meta({ id: 'ConnectorSecretPostRequest' })
export type ConnectorSecretPostRequest = z.infer<typeof ConnectorSecretPostRequest>

export const ConnectorSecretPostResponse = z.object({
  id: z.string()
}).meta({ id: 'ConnectorSecretPostResponse' })
export type ConnectorSecretPostResponse = z.infer<typeof ConnectorSecretPostResponse>
