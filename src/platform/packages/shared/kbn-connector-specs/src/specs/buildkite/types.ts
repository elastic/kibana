/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// Shared field builders
// =============================================================================

const pipelineSlug = () =>
  z
    .string()
    .min(1)
    .max(200)
    .describe('The pipeline slug, e.g. "my-pipeline". Use listPipelines to discover slugs.');

const buildNumber = () =>
  z
    .union([z.string(), z.number()])
    .describe(
      'The build number — a sequential integer shown in the Buildkite UI and API (e.g. 42 or "42"), NOT the build\'s UUID "id" field.'
    );

const jobId = () =>
  z.string().min(1).max(64).describe('The UUID of the job, returned by the listJobs action.');

const page = () =>
  z.number().int().min(1).optional().describe('Page number for pagination (min 1, default 1).');

const perPage = () =>
  z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Results per page for pagination (min 1, max 100, default 30).');

const boundedRecord = (maxEntries: number, valueMax: number) =>
  z
    .record(z.string().max(200), z.string().max(valueMax))
    .refine((v) => Object.keys(v).length <= maxEntries, {
      message: `Must contain at most ${maxEntries} entries`,
    });

// =============================================================================
// Builds
// =============================================================================

export const CreateBuildInputSchema = lazySchema(() =>
  z.object({
    pipelineSlug: pipelineSlug(),
    commit: z
      .string()
      .min(1)
      .max(100)
      .describe('The commit SHA to build. Use "HEAD" to build the latest commit on the branch.'),
    branch: z.string().min(1).max(200).describe('The git branch to build, e.g. "main".'),
    message: z
      .string()
      .max(2000)
      .optional()
      .describe('Optional build message shown in the Buildkite UI, e.g. the commit message.'),
    ignoreBranchFilters: z
      .boolean()
      .optional()
      .describe(
        'When true, triggers the build even if the pipeline steps have branch filters that would otherwise exclude this branch. Defaults to false.'
      ),
    environment: boundedRecord(50, 4000)
      .optional()
      .describe(
        'Environment variables to set for the build, as a key/value map (max 50 entries). Example: { "DEPLOY_ENV": "staging" }.'
      ),
    metadata: boundedRecord(50, 4000)
      .optional()
      .describe(
        'Build meta-data values to set for the build, as a key/value map (max 50 entries). Retrievable later via job environment or the Buildkite UI.'
      ),
  })
);
export type CreateBuildInput = z.infer<typeof CreateBuildInputSchema>;

export const GetBuildInputSchema = lazySchema(() =>
  z.object({
    pipelineSlug: pipelineSlug(),
    buildNumber: buildNumber(),
  })
);
export type GetBuildInput = z.infer<typeof GetBuildInputSchema>;

export const ListBuildsInputSchema = lazySchema(() =>
  z.object({
    pipelineSlug: pipelineSlug()
      .optional()
      .describe(
        'Filter builds by pipeline slug. When omitted, lists builds across every pipeline in the organization.'
      ),
    branch: z
      .string()
      .max(200)
      .optional()
      .describe('Filter builds by git branch name, e.g. "main".'),
    state: z
      .enum(['scheduled', 'running', 'passed', 'failed', 'canceled', 'skipped'])
      .optional()
      .describe('Filter builds by state.'),
    commit: z.string().max(100).optional().describe('Filter builds by exact commit SHA.'),
    creator: z
      .string()
      .max(200)
      .optional()
      .describe('Filter builds by the name or email of the build creator.'),
    page: page(),
    perPage: perPage(),
  })
);
export type ListBuildsInput = z.infer<typeof ListBuildsInputSchema>;

export const CancelBuildInputSchema = lazySchema(() =>
  z.object({
    pipelineSlug: pipelineSlug(),
    buildNumber: buildNumber(),
  })
);
export type CancelBuildInput = z.infer<typeof CancelBuildInputSchema>;

export const RebuildInputSchema = lazySchema(() =>
  z.object({
    pipelineSlug: pipelineSlug(),
    buildNumber: buildNumber(),
  })
);
export type RebuildInput = z.infer<typeof RebuildInputSchema>;

export const RetryFailedJobsInputSchema = lazySchema(() =>
  z.object({
    pipelineSlug: pipelineSlug(),
    buildNumber: buildNumber(),
  })
);
export type RetryFailedJobsInput = z.infer<typeof RetryFailedJobsInputSchema>;

// =============================================================================
// Jobs
// =============================================================================

export const ListJobsInputSchema = lazySchema(() =>
  z.object({
    pipelineSlug: pipelineSlug(),
    buildNumber: buildNumber(),
    state: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Filter jobs by state. Comma-separated for multiple states, e.g. "failed,broken" to find jobs to retry after a CI failure.'
      ),
    perPage: perPage(),
  })
);
export type ListJobsInput = z.infer<typeof ListJobsInputSchema>;

export const UnblockJobInputSchema = lazySchema(() =>
  z.object({
    pipelineSlug: pipelineSlug(),
    buildNumber: buildNumber(),
    jobId: jobId(),
    fields: boundedRecord(50, 2000)
      .optional()
      .describe(
        "Values for the block step's input fields, as a key/value map of field key to string value (max 50 entries). Only needed if the block step defines fields."
      ),
  })
);
export type UnblockJobInput = z.infer<typeof UnblockJobInputSchema>;

export const RetryJobInputSchema = lazySchema(() =>
  z.object({
    pipelineSlug: pipelineSlug(),
    buildNumber: buildNumber(),
    jobId: jobId(),
  })
);
export type RetryJobInput = z.infer<typeof RetryJobInputSchema>;

export const GetJobLogInputSchema = lazySchema(() =>
  z.object({
    pipelineSlug: pipelineSlug(),
    buildNumber: buildNumber(),
    jobId: jobId(),
    seek: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Row number to start reading from (0-based). Omit to read from the start of the log.'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(5000)
      .optional()
      .describe(
        'Maximum number of log lines to return (1-5000, default 500). Bounded to avoid excessive token usage — for a failing job, prefer reading from the end by combining a high seek value with this limit, or fetch in pages.'
      ),
  })
);
export type GetJobLogInput = z.infer<typeof GetJobLogInputSchema>;

// =============================================================================
// Annotations
// =============================================================================

export const CreateBuildAnnotationInputSchema = lazySchema(() =>
  z.object({
    pipelineSlug: pipelineSlug(),
    buildNumber: buildNumber(),
    body: z
      .string()
      .min(1)
      .max(20000)
      .describe('The annotation body as HTML or Markdown, e.g. "### Test failures\\n- ..." '),
    style: z
      .enum(['success', 'info', 'warning', 'error'])
      .optional()
      .describe('Visual style of the annotation. Defaults to "info" when omitted.'),
    context: z
      .string()
      .max(200)
      .optional()
      .describe(
        'A unique key identifying this annotation. Reusing the same context with append=true appends to the existing annotation instead of creating a new one; reusing it without append replaces the annotation.'
      ),
    priority: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe(
        'Priority from 1 to 10, controlling display order on the build page (higher shows first).'
      ),
    append: z
      .boolean()
      .optional()
      .describe(
        'When true, appends the body to the existing annotation with the same context instead of replacing it. Defaults to false.'
      ),
  })
);
export type CreateBuildAnnotationInput = z.infer<typeof CreateBuildAnnotationInputSchema>;

export const ListBuildAnnotationsInputSchema = lazySchema(() =>
  z.object({
    pipelineSlug: pipelineSlug(),
    buildNumber: buildNumber(),
    page: page(),
    perPage: perPage(),
  })
);
export type ListBuildAnnotationsInput = z.infer<typeof ListBuildAnnotationsInputSchema>;

// =============================================================================
// Pipelines
// =============================================================================

export const ListPipelinesInputSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .max(200)
      .optional()
      .describe('Filter pipelines whose name contains this string.'),
    repository: z
      .string()
      .max(500)
      .optional()
      .describe('Filter pipelines by their repository URL.'),
    page: page(),
    perPage: perPage(),
  })
);
export type ListPipelinesInput = z.infer<typeof ListPipelinesInputSchema>;

export const GetPipelineInputSchema = lazySchema(() =>
  z.object({
    pipelineSlug: pipelineSlug(),
  })
);
export type GetPipelineInput = z.infer<typeof GetPipelineInputSchema>;

// =============================================================================
// Artifacts
// =============================================================================

export const ListArtifactsInputSchema = lazySchema(() =>
  z.object({
    pipelineSlug: pipelineSlug(),
    buildNumber: buildNumber(),
    page: page(),
    perPage: perPage(),
  })
);
export type ListArtifactsInput = z.infer<typeof ListArtifactsInputSchema>;

// =============================================================================
// MCP escape hatches
// =============================================================================

export const ListToolsInputSchema = lazySchema(() => z.object({}));
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;

export const CallToolInputSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'Name of the MCP tool to call on the Buildkite MCP server, e.g. "list_clusters". Use listTools first to discover available tool names.'
      ),
    arguments: z
      .record(z.string().max(200), z.unknown())
      .refine((v) => Object.keys(v).length <= 100, {
        message: 'Must contain at most 100 entries',
      })
      .optional()
      .describe(
        'Arguments to pass to the tool as a key/value object. The connector automatically fills in "org_slug" from the connector configuration unless you override it here. Use listTools to see each tool\'s parameter schema.'
      ),
  })
);
export type CallToolInput = z.infer<typeof CallToolInputSchema>;
