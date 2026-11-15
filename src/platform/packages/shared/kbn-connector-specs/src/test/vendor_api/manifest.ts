/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { toStableJson } from './stable_json';

const sourceSchema = z
  .object({
    /** The format the vendor publishes; snapshots are always OpenAPI 3.x JSON. */
    format: z.enum(['openapi', 'swagger', 'discovery']),
    url: z.url(),
    /** The spec's `info.version`, when it has one. */
    apiVersion: z.string().optional(),
    /** When the snapshot last changed, as an ISO date-time. */
    fetchedAt: z.iso.datetime(),
  })
  .strict();

const operationSchema = z
  .object({
    source: z.string(),
    /** Lowercase, as in the spec. */
    method: z.string(),
    /** The path template, as in the spec. */
    path: z.string(),
  })
  .strict();

const unmatchedSchema = z
  .object({
    method: z.string(),
    /** The URL path the action requested, which matches no operation of any source. */
    path: z.string(),
    /** Why this is expected, e.g. an endpoint the vendor spec omits, with a link to follow up. */
    reason: z.string().min(1),
  })
  .strict();

/** `vendor_api/manifest.json`: the vendor specs a connector depends on and what it calls. */
export const vendorApiManifestSchema = z
  .object({
    sources: z.record(z.string(), sourceSchema),
    /** Per action, the vendor operations it calls, sorted. */
    operations: z.record(z.string(), z.array(operationSchema)),
    /** Per action, acknowledged requests that match no vendor operation. */
    unmatched: z.record(z.string(), z.array(unmatchedSchema)).optional(),
  })
  .strict();

export type VendorApiManifest = z.infer<typeof vendorApiManifestSchema>;
export type ManifestOperation = z.infer<typeof operationSchema>;
export type ManifestSource = z.infer<typeof sourceSchema>;
export type UnmatchedRequest = z.infer<typeof unmatchedSchema>;

export const parseManifest = (json: string): VendorApiManifest =>
  vendorApiManifestSchema.parse(JSON.parse(json));

export const serializeManifest = (manifest: VendorApiManifest): string =>
  toStableJson(vendorApiManifestSchema.parse(manifest));
