/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

const DEFAULT_MAX_RESULTS = 100;

export const ListProjectsInputSchema = z.object({
  pageSize: z
    .number()
    .optional()
    .describe(`Maximum number of projects to return (default: ${DEFAULT_MAX_RESULTS})`),
  pageToken: z.string().optional().describe('Token for pagination'),
  filter: z
    .string()
    .optional()
    .describe(
      'Filter expression (e.g. "name:my-project" or "lifecycleState:ACTIVE"). See Google Cloud Resource Manager docs for syntax.'
    ),
});
export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;

export const ListBucketsInputSchema = z.object({
  project: z
    .string()
    .min(1)
    .describe(
      'Google Cloud project ID. Use list_projects to discover available project IDs.'
    ),
  maxResults: z
    .number()
    .optional()
    .describe(`Maximum number of buckets to return (default: ${DEFAULT_MAX_RESULTS})`),
  pageToken: z.string().optional().describe('Token for pagination'),
  prefix: z.string().optional().describe('Filter buckets whose names begin with this prefix'),
});
export type ListBucketsInput = z.infer<typeof ListBucketsInputSchema>;

export const ListObjectsInputSchema = z.object({
  bucket: z.string().min(1).describe('Name of the bucket to list objects from'),
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
    .describe(`Maximum number of objects to return (default: ${DEFAULT_MAX_RESULTS})`),
  pageToken: z.string().optional().describe('Token for pagination'),
});
export type ListObjectsInput = z.infer<typeof ListObjectsInputSchema>;

export const GetObjectMetadataInputSchema = z.object({
  bucket: z.string().min(1).describe('Name of the bucket'),
  object: z
    .string()
    .min(1)
    .describe('Full name/path of the object (e.g. "reports/2024/january.pdf")'),
});
export type GetObjectMetadataInput = z.infer<typeof GetObjectMetadataInputSchema>;

export const DownloadObjectInputSchema = z.object({
  bucket: z.string().min(1).describe('Name of the bucket'),
  object: z
    .string()
    .min(1)
    .describe('Full name/path of the object to download (e.g. "reports/2024/january.pdf")'),
});
export type DownloadObjectInput = z.infer<typeof DownloadObjectInputSchema>;
