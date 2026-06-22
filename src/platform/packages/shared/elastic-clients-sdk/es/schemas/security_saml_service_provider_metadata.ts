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

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

/**
 * Create SAML service provider metadata.
 *
 * Generate SAML metadata for a SAML 2.0 Service Provider.
 *
 * The SAML 2.0 specification provides a mechanism for Service Providers to describe their capabilities and configuration using a metadata file.
 * This API generates Service Provider metadata based on the configuration of a SAML realm in Elasticsearch.
 */
export const SecuritySamlServiceProviderMetadataRequest = z.object({
  ...RequestBase.shape,
  realm_name: Name.describe('The name of the SAML realm in Elasticsearch.').meta({ found_in: 'path' })
}).meta({ id: 'SecuritySamlServiceProviderMetadataRequest' })
export type SecuritySamlServiceProviderMetadataRequest = z.infer<typeof SecuritySamlServiceProviderMetadataRequest>

export const SecuritySamlServiceProviderMetadataResponse = z.object({
  metadata: z.string().describe('An XML string that contains a SAML Service Provider\'s metadata for the realm.')
}).meta({ id: 'SecuritySamlServiceProviderMetadataResponse' })
export type SecuritySamlServiceProviderMetadataResponse = z.infer<typeof SecuritySamlServiceProviderMetadataResponse>
