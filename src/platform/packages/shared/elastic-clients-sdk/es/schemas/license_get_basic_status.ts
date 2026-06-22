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

/** Get the basic license status. */
export const LicenseGetBasicStatusRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'LicenseGetBasicStatusRequest' })
export type LicenseGetBasicStatusRequest = z.infer<typeof LicenseGetBasicStatusRequest>

export const LicenseGetBasicStatusResponse = z.object({
  eligible_to_start_basic: z.boolean()
}).meta({ id: 'LicenseGetBasicStatusResponse' })
export type LicenseGetBasicStatusResponse = z.infer<typeof LicenseGetBasicStatusResponse>
