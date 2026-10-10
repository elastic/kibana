/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { PaginationDescriptor } from '@kbn/connector-contract-mock';
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

const located = { in: z.enum(['query', 'body', 'header']).optional() };
const size = { sizeParam: z.string().min(1).optional() };
const cursorRequest = { cursorParam: z.string().min(1), ...size };
const offsetRequest = { offsetParam: z.string().min(1), ...size };
const pageRequest = {
  pageParam: z.string().min(1),
  ...size,
  firstPage: z.number().int().nonnegative().optional(),
};
const nextUrlRequestSchema = z.union([
  z.object(cursorRequest).strict(),
  z.object(offsetRequest).strict(),
  z.object(pageRequest).strict(),
]);
const defaultSize = { defaultSize: z.number().int().positive().optional() };
const itemsPath = z.string();
const totalResponseSchema = z.object({ itemsPath, totalPath: z.string().optional() }).strict();

const paginationSchema = z.discriminatedUnion('style', [
  z
    .object({
      style: z.literal('cursor'),
      request: z.object({ ...cursorRequest, ...located }).strict(),
      response: z
        .object({
          in: z.enum(['body', 'header']).optional(),
          itemsPath,
          nextPath: z.string().min(1),
          hasMorePath: z.string().optional(),
        })
        .strict(),
      end: z.enum(['empty_string', 'null', 'missing']).optional(),
      ...defaultSize,
    })
    .strict(),
  z
    .object({
      style: z.literal('offset'),
      request: z.object({ ...offsetRequest, ...located }).strict(),
      response: totalResponseSchema,
      ...defaultSize,
    })
    .strict(),
  z
    .object({
      style: z.literal('page'),
      request: z.object({ ...pageRequest, ...located }).strict(),
      response: totalResponseSchema,
      ...defaultSize,
    })
    .strict(),
  z
    .object({
      style: z.literal('link'),
      request: nextUrlRequestSchema,
      response: z.object({ itemsPath }).strict(),
      ...defaultSize,
    })
    .strict(),
  z
    .object({
      style: z.literal('next_url'),
      request: nextUrlRequestSchema,
      response: z.object({ itemsPath, nextPath: z.string().min(1) }).strict(),
      end: z.enum(['null', 'missing']).optional(),
      ...defaultSize,
    })
    .strict(),
]);

const operationSchema = z
  .object({
    source: z.string(),
    /** Lowercase, as in the spec. */
    method: z.string(),
    /** The path template, as in the spec. */
    path: z.string(),
    /**
     * How the operation pages, for the contract mock; `none` for list-like operations that
     * return everything in one response.
     */
    pagination: z.union([z.literal('none'), paginationSchema]).optional(),
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
export type ManifestPagination = NonNullable<ManifestOperation['pagination']>;

/** A manifest descriptor, as the contract mock takes it; fails to compile if the two diverge. */
export const toPaginationDescriptor = (
  pagination: Exclude<ManifestPagination, 'none'>
): PaginationDescriptor => pagination;

export const parseManifest = (json: string): VendorApiManifest =>
  vendorApiManifestSchema.parse(JSON.parse(json));

export const serializeManifest = (manifest: VendorApiManifest): string =>
  toStableJson(vendorApiManifestSchema.parse(manifest));
