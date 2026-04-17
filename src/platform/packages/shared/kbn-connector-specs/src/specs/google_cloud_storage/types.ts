/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

const DEFAULT_PAGE_SIZE = 100;

export const ListProjectsInputSchema = z.object({
  pageSize: z
    .number()
    .optional()
    .describe(`Maximum number of projects to return (default: ${DEFAULT_PAGE_SIZE}, max 1000)`),
  pageToken: z
    .string()
    .optional()
    .describe('Pagination token from a previous response to get the next page of results'),
  filter: z
    .string()
    .optional()
    .describe(
      'Optional filter expression. Supported operators: "name:" (project name contains), "id:" (exact project ID), "lifecycleState:" (ACTIVE, DELETE_REQUESTED, etc.). Examples: "name:production", "lifecycleState:ACTIVE".'
    ),
});
export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;

export const ListBucketsInputSchema = z.object({
  project: z
    .string()
    .min(1)
    .describe(
      'Google Cloud project ID (e.g. "my-project-123"). Use listProjects to discover available project IDs.'
    ),
  maxResults: z
    .number()
    .optional()
    .describe(`Maximum number of buckets to return (default: ${DEFAULT_PAGE_SIZE}, max 1000)`),
  pageToken: z
    .string()
    .optional()
    .describe('Pagination token from a previous response to get the next page of results'),
  prefix: z.string().optional().describe('Filter buckets whose names begin with this prefix'),
});
export type ListBucketsInput = z.infer<typeof ListBucketsInputSchema>;

export const ListObjectsInputSchema = z.object({
  bucket: z.string().min(1).describe('Name of the GCS bucket to list objects from'),
  prefix: z
    .string()
    .optional()
    .describe(
      'Filter objects whose names begin with this prefix. Use to navigate "folders" (e.g. "reports/2024/")'
    ),
  delimiter: z
    .string()
    .optional()
    .describe(
      'Character used to group object names. Use "/" to list only the current folder level'
    ),
  maxResults: z
    .number()
    .optional()
    .describe(`Maximum number of objects to return (default: ${DEFAULT_PAGE_SIZE}, max 1000)`),
  pageToken: z
    .string()
    .optional()
    .describe('Pagination token from a previous response to get the next page of results'),
});
export type ListObjectsInput = z.infer<typeof ListObjectsInputSchema>;

export const GetObjectMetadataInputSchema = z.object({
  bucket: z.string().min(1).describe('Name of the GCS bucket containing the object'),
  object: z
    .string()
    .min(1)
    .describe('Full name/path of the object (e.g. "reports/2024/january.pdf")'),
});
export type GetObjectMetadataInput = z.infer<typeof GetObjectMetadataInputSchema>;

const DEFAULT_MAX_DOWNLOAD_SIZE_BYTES = 768000; // ~750 KB (safe ceiling before base64 hits the 1 MB platform response limit)

export const DownloadObjectInputSchema = z.object({
  bucket: z.string().min(1).describe('Name of the GCS bucket containing the object'),
  object: z
    .string()
    .min(1)
    .describe('Full name/path of the object to download (e.g. "reports/jan.pdf", "data/q1.csv")'),
  maximumDownloadSizeBytes: z
    .number()
    .optional()
    .default(DEFAULT_MAX_DOWNLOAD_SIZE_BYTES)
    .describe(
      `Maximum file size in bytes to download inline. Files exceeding this limit return metadata only. Default is ${DEFAULT_MAX_DOWNLOAD_SIZE_BYTES} (~750 KB).`
    ),
});
export type DownloadObjectInput = z.infer<typeof DownloadObjectInputSchema>;
