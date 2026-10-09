/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Buildkite MCP Connector (v2)
 *
 * An MCP-native v2 connector that connects to Buildkite's officially hosted
 * remote MCP server via its API-token pass-through endpoint
 * (https://mcp.buildkite.com/direct). See
 * https://buildkite.com/docs/apis/mcp-server for server documentation.
 *
 * Auth: Bearer token (Buildkite API access token)
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { UISchemas, type ActionContext, type ConnectorSpec } from '../../connector_spec';
import { withMcpClient, callToolJson, parseJsonTextFromContentParts } from '../../lib/mcp';
import type {
  CallToolInput,
  CancelBuildInput,
  CreateBuildAnnotationInput,
  CreateBuildInput,
  GetBuildInput,
  GetJobLogInput,
  GetPipelineInput,
  ListArtifactsInput,
  ListBuildAnnotationsInput,
  ListBuildsInput,
  ListJobsInput,
  ListPipelinesInput,
  RebuildInput,
  RetryFailedJobsInput,
  RetryJobInput,
  UnblockJobInput,
} from './types';
import {
  CallToolInputSchema,
  CancelBuildInputSchema,
  CreateBuildAnnotationInputSchema,
  CreateBuildInputSchema,
  GetBuildInputSchema,
  GetJobLogInputSchema,
  GetPipelineInputSchema,
  ListArtifactsInputSchema,
  ListBuildAnnotationsInputSchema,
  ListBuildsInputSchema,
  ListJobsInputSchema,
  ListPipelinesInputSchema,
  ListToolsInputSchema,
  RebuildInputSchema,
  RetryFailedJobsInputSchema,
  RetryJobInputSchema,
  UnblockJobInputSchema,
} from './types';

const BUILDKITE_MCP_SERVER_URL = 'https://mcp.buildkite.com/direct';
const DEFAULT_LOG_LIMIT = 500;
// Jobs in these states can be retried; "broken" jobs never ran (e.g. a branch
// filter or upstream dependency prevented execution) but Buildkite still
// allows retrying them once the blocking condition is resolved.
const RETRYABLE_JOB_STATES = 'failed,broken,timed_out';

const getOrgSlug = (ctx: ActionContext): string => {
  const orgSlug = (ctx.config?.orgSlug as string | undefined)?.trim();
  if (!orgSlug) {
    throw new Error('Buildkite connector is missing the required orgSlug configuration field.');
  }
  return orgSlug;
};

/** Every Buildkite MCP tool requires org_slug; inject it from config on every call. */
const buildArgs = (ctx: ActionContext, args: Record<string, unknown>): Record<string, unknown> => ({
  org_slug: getOrgSlug(ctx),
  ...args,
});

const toEntries = (
  record?: Record<string, string>
): Array<{ key: string; value: string }> | undefined => {
  if (!record) {
    return undefined;
  }
  return Object.entries(record).map(([key, value]) => ({ key, value }));
};

interface JobSummary {
  id: string;
  name?: string;
}

export const Buildkite: ConnectorSpec = {
  metadata: {
    id: '.buildkite',
    displayName: 'Buildkite',
    description: i18n.translate('core.kibanaConnectorSpecs.buildkite.metadata.description', {
      defaultMessage:
        'Trigger, observe, retry, and cancel Buildkite builds, unblock deploy gates, and post annotations',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        isRecommended: true,
        defaults: {},
        overrides: {
          meta: {
            token: {
              label: i18n.translate('core.kibanaConnectorSpecs.buildkite.auth.bearer.token.label', {
                defaultMessage: 'API Access Token',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.buildkite.auth.bearer.token.helpText',
                {
                  defaultMessage:
                    'A Buildkite API access token with the read_pipelines, read_builds, write_builds, read_artifacts, and read_build_logs scopes. Create one at buildkite.com/user/api-access-tokens.',
                }
              ),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      serverUrl: UISchemas.url()
        .default(BUILDKITE_MCP_SERVER_URL)
        .describe('Buildkite MCP Server URL')
        .meta({
          widget: 'text',
          placeholder: BUILDKITE_MCP_SERVER_URL,
          hidden: true,
          label: i18n.translate('core.kibanaConnectorSpecs.buildkite.config.serverUrl.label', {
            defaultMessage: 'MCP Server URL',
          }),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.buildkite.config.serverUrl.helpText',
            {
              defaultMessage:
                "The URL of Buildkite's hosted MCP server (API-token pass-through endpoint).",
            }
          ),
        }),
      orgSlug: z
        .string()
        .min(1)
        .max(200)
        .describe('Your Buildkite organization slug')
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.buildkite.config.orgSlug.label', {
            defaultMessage: 'Organization slug',
          }),
          placeholder: 'my-organization',
          helpText: i18n.translate('core.kibanaConnectorSpecs.buildkite.config.orgSlug.helpText', {
            defaultMessage:
              'The slug of your Buildkite organization, found in the URL: buildkite.com/your-slug/. Every action in this connector runs against this organization.',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    createBuild: {
      isTool: true,
      description:
        'Trigger a new build on a Buildkite pipeline for a specific commit and branch, with optional message, environment variables, and meta-data. Returns the created build, including its number and state. This is the core action for kicking off CI/CD from a workflow.',
      input: CreateBuildInputSchema,
      handler: async (ctx, input: CreateBuildInput) => {
        return callToolJson(
          ctx,
          'create_build',
          buildArgs(ctx, {
            pipeline_slug: input.pipelineSlug,
            commit: input.commit,
            branch: input.branch,
            message: input.message,
            ignore_branch_filters: input.ignoreBranchFilters,
            environment: toEntries(input.environment),
            metadata: toEntries(input.metadata),
          })
        );
      },
    },

    getBuild: {
      isTool: true,
      description:
        'Get a single build by pipeline slug and build number, including its state, timing, and annotation summaries. Jobs are not included — use listJobs or getJobLog for job-level detail. Use this to poll a build triggered by createBuild before deciding the next workflow step.',
      input: GetBuildInputSchema,
      handler: async (ctx, input: GetBuildInput) => {
        return callToolJson(
          ctx,
          'get_build',
          buildArgs(ctx, {
            pipeline_slug: input.pipelineSlug,
            build_number: String(input.buildNumber),
          })
        );
      },
    },

    listBuilds: {
      isTool: true,
      description:
        'List builds for a pipeline, or across every pipeline in the organization when pipelineSlug is omitted, with optional filtering by branch, state, commit, or creator. Returns lightweight build summaries (jobs are excluded). Use this to find a build to act on when you do not already know its build number.',
      input: ListBuildsInputSchema,
      handler: async (ctx, input: ListBuildsInput) => {
        return callToolJson(
          ctx,
          'list_builds',
          buildArgs(ctx, {
            pipeline_slug: input.pipelineSlug,
            branch: input.branch,
            state: input.state,
            commit: input.commit,
            creator: input.creator,
            page: input.page,
            per_page: input.perPage,
          })
        );
      },
    },

    cancelBuild: {
      isTool: true,
      description:
        'Cancel a running or scheduled build on a Buildkite pipeline. Use this to stop a bad or superseded build automatically, for example after detecting a newer commit on the same branch.',
      input: CancelBuildInputSchema,
      handler: async (ctx, input: CancelBuildInput) => {
        return callToolJson(
          ctx,
          'cancel_build',
          buildArgs(ctx, {
            pipeline_slug: input.pipelineSlug,
            build_number: String(input.buildNumber),
          })
        );
      },
    },

    rebuild: {
      isTool: true,
      description:
        'Rebuild an entire build on a Buildkite pipeline, creating a new build from the same commit, branch, and environment. Use this to re-run everything after a transient infrastructure failure or a pipeline configuration fix. To retry only the jobs that failed instead of the whole build, use retryFailedJobs.',
      input: RebuildInputSchema,
      handler: async (ctx, input: RebuildInput) => {
        return callToolJson(
          ctx,
          'rebuild_build',
          buildArgs(ctx, {
            pipeline_slug: input.pipelineSlug,
            build_number: String(input.buildNumber),
          })
        );
      },
    },

    retryFailedJobs: {
      isTool: true,
      description:
        'Retry every failed, broken, or timed-out job in a build, leaving passed jobs alone. This is the standard self-heal action for flaky CI failures. Returns the list of jobs that were retried, plus any that could not be retried. To retry a single job instead, use retryJob; to re-run the whole build, use rebuild.',
      input: RetryFailedJobsInputSchema,
      handler: async (ctx, input: RetryFailedJobsInput) => {
        return withMcpClient(ctx, async (mcp) => {
          const listResult = await mcp.callTool({
            name: 'list_jobs',
            arguments: buildArgs(ctx, {
              pipeline_slug: input.pipelineSlug,
              build_number: String(input.buildNumber),
              state: RETRYABLE_JOB_STATES,
            }),
          });
          const parsed = parseJsonTextFromContentParts(listResult.content) as
            | { items?: JobSummary[] }
            | undefined;
          const jobs = parsed?.items ?? [];

          const results: Array<{
            jobId: string;
            name?: string;
            status: 'retried' | 'error';
            error?: string;
          }> = [];

          for (const job of jobs) {
            try {
              await mcp.callTool({
                name: 'retry_job',
                arguments: buildArgs(ctx, {
                  pipeline_slug: input.pipelineSlug,
                  build_number: String(input.buildNumber),
                  job_id: job.id,
                }),
              });
              results.push({ jobId: job.id, name: job.name, status: 'retried' });
            } catch (error) {
              results.push({
                jobId: job.id,
                name: job.name,
                status: 'error',
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          return {
            retriedCount: results.filter((r) => r.status === 'retried').length,
            jobs: results,
          };
        });
      },
    },

    listJobs: {
      isTool: true,
      description:
        'List the jobs in a build, with an optional comma-separated state filter (e.g. "failed,broken" to find jobs to investigate or retry). Returns each job\'s id, name, state, and command. Use the returned job ids with retryJob, unblockJob, or getJobLog.',
      input: ListJobsInputSchema,
      handler: async (ctx, input: ListJobsInput) => {
        return callToolJson(
          ctx,
          'list_jobs',
          buildArgs(ctx, {
            pipeline_slug: input.pipelineSlug,
            build_number: String(input.buildNumber),
            state: input.state,
            per_page: input.perPage,
          })
        );
      },
    },

    unblockJob: {
      isTool: true,
      description:
        'Unblock a blocked (manual-gate) job so the build proceeds, optionally supplying values for the block step\'s input fields. Use this to automate deploy-gate approval. Find the blocked job\'s id with listJobs (state="blocked").',
      input: UnblockJobInputSchema,
      handler: async (ctx, input: UnblockJobInput) => {
        return callToolJson(
          ctx,
          'unblock_job',
          buildArgs(ctx, {
            pipeline_slug: input.pipelineSlug,
            build_number: String(input.buildNumber),
            job_id: input.jobId,
            fields: input.fields,
          })
        );
      },
    },

    retryJob: {
      isTool: true,
      description:
        'Retry a single failed or timed-out job in a build, leaving every other job untouched. Use this for a targeted retry when only one step failed. Find the job id with listJobs. To retry every failed job in a build at once, use retryFailedJobs instead.',
      input: RetryJobInputSchema,
      handler: async (ctx, input: RetryJobInput) => {
        return callToolJson(
          ctx,
          'retry_job',
          buildArgs(ctx, {
            pipeline_slug: input.pipelineSlug,
            build_number: String(input.buildNumber),
            job_id: input.jobId,
          })
        );
      },
    },

    getJobLog: {
      isTool: true,
      description:
        'Get log output for a job, returning up to `limit` lines starting at row `seek`. Find the job id with listJobs. Use this to pull failure output for triage or to attach to a case. The response is bounded by `limit` (default 500) to control token usage — for a long log, page through with increasing `seek` values.',
      input: GetJobLogInputSchema,
      handler: async (ctx, input: GetJobLogInput) => {
        return callToolJson(
          ctx,
          'read_logs',
          buildArgs(ctx, {
            pipeline_slug: input.pipelineSlug,
            build_number: String(input.buildNumber),
            job_id: input.jobId,
            seek: input.seek,
            limit: input.limit ?? DEFAULT_LOG_LIMIT,
          })
        );
      },
    },

    createBuildAnnotation: {
      isTool: true,
      description:
        'Create or append to an annotation on a build, shown on the build page in the Buildkite UI. Use this to post workflow findings, remediation status, or links back onto the build. Pass the same `context` value with `append: true` to append to an existing annotation instead of creating a new one.',
      input: CreateBuildAnnotationInputSchema,
      handler: async (ctx, input: CreateBuildAnnotationInput) => {
        return callToolJson(
          ctx,
          'create_annotation',
          buildArgs(ctx, {
            pipeline_slug: input.pipelineSlug,
            build_number: String(input.buildNumber),
            body: input.body,
            style: input.style,
            context: input.context,
            priority: input.priority,
            append: input.append,
          })
        );
      },
    },

    listBuildAnnotations: {
      isTool: true,
      description:
        'List the annotations posted on a build. Use this to read context posted by earlier workflow steps or other tools before deciding what to post next with createBuildAnnotation.',
      input: ListBuildAnnotationsInputSchema,
      handler: async (ctx, input: ListBuildAnnotationsInput) => {
        return callToolJson(
          ctx,
          'list_annotations',
          buildArgs(ctx, {
            pipeline_slug: input.pipelineSlug,
            build_number: String(input.buildNumber),
            page: input.page,
            per_page: input.perPage,
          })
        );
      },
    },

    listPipelines: {
      isTool: true,
      description:
        'List the pipelines in the configured organization, with their names, slugs, and basic status. Use this to discover the pipelineSlug to target with other actions when you do not already know it.',
      input: ListPipelinesInputSchema,
      handler: async (ctx, input: ListPipelinesInput) => {
        return callToolJson(
          ctx,
          'list_pipelines',
          buildArgs(ctx, {
            name: input.name,
            repository: input.repository,
            page: input.page,
            per_page: input.perPage,
          })
        );
      },
    },

    getPipeline: {
      isTool: true,
      description:
        'Get detailed configuration and metadata for a single pipeline, including its repository, default branch, and step count. Use listPipelines first if you do not already know the pipelineSlug.',
      input: GetPipelineInputSchema,
      handler: async (ctx, input: GetPipelineInput) => {
        return callToolJson(
          ctx,
          'get_pipeline',
          buildArgs(ctx, {
            pipeline_slug: input.pipelineSlug,
          })
        );
      },
    },

    listArtifacts: {
      isTool: true,
      description:
        'List the artifacts a build produced across all of its jobs, including filenames, paths, sizes, and MIME types. Use this to locate a build output a workflow needs; download the file itself using the callTool escape hatch with the "get_artifact" tool and the returned artifact id and job_id.',
      input: ListArtifactsInputSchema,
      handler: async (ctx, input: ListArtifactsInput) => {
        return callToolJson(
          ctx,
          'list_artifacts_for_build',
          buildArgs(ctx, {
            pipeline_slug: input.pipelineSlug,
            build_number: String(input.buildNumber),
            page: input.page,
            per_page: input.perPage,
          })
        );
      },
    },

    listTools: {
      isTool: true,
      description:
        'List every MCP tool exposed by the Buildkite MCP server, including ones not covered by a named action (e.g. clusters, agents, pipeline schedules, Test Engine). Use this to discover tools to call with callTool.',
      input: ListToolsInputSchema,
      handler: async (ctx) => {
        return withMcpClient(ctx, async (mcp) => {
          const { tools } = await mcp.listTools();
          return tools;
        });
      },
    },

    callTool: {
      isTool: true,
      description:
        'Call any tool on the Buildkite MCP server directly by name. Use this as an escape hatch for tools not yet exposed as a named action — for example, downloading an artifact\'s content with "get_artifact", or searching job logs with "search_logs". The organization slug is filled in automatically for tools that accept it (most do; a few org-independent tools like "access_token" or "current_user" do not). Use listTools first to discover available tool names and their parameters.',
      input: CallToolInputSchema,
      handler: async (ctx, input: CallToolInput) => {
        return withMcpClient(ctx, async (mcp) => {
          const { tools } = await mcp.listTools();
          const targetTool = tools.find((tool) => tool.name === input.name);
          const acceptsOrgSlug =
            !targetTool ||
            Boolean(
              (targetTool.inputSchema as { properties?: Record<string, unknown> } | undefined)
                ?.properties?.org_slug
            );
          const args = acceptsOrgSlug
            ? buildArgs(ctx, input.arguments ?? {})
            : input.arguments ?? {};
          const result = await mcp.callTool({ name: input.name, arguments: args });
          return result.content;
        });
      },
    },
  },

  skill: [
    'Buildkite — cross-action guidance for driving CI/CD from a workflow.',
    '',
    'Every action runs against the organization configured on the connector; only pipeline, build, and job identifiers need to be supplied.',
    '',
    'build_number is the sequential integer shown in the Buildkite UI and API (e.g. 42), not the build\'s UUID "id" field.',
    '',
    'Typical patterns:',
    '  - Discover a pipeline: call `listPipelines`, then use the returned `slug` as `pipelineSlug` everywhere else.',
    '  - Find a build to act on: call `listBuilds` (optionally filtered by branch/state/commit), or use the build number you already have.',
    '  - Diagnose a failure: call `getBuild` for overall state, `listJobs` with `state="failed,broken"` to find the failing jobs, then `getJobLog` on each to read output.',
    '  - Self-heal: call `retryFailedJobs` to retry every failed/broken/timed-out job at once, `retryJob` to retry just one, or `rebuild` to re-run the whole build.',
    '  - Automate a deploy gate: call `listJobs` with `state="blocked"` to find the blocked job, then `unblockJob` to let it proceed.',
    '  - Report back: call `createBuildAnnotation` to post findings on the build; reuse the same `context` value with `append: true` to add to an existing annotation instead of creating a new one.',
    '',
    'For tools not covered by a named action (clusters, agents, pipeline schedules, Test Engine, artifact downloads, log search), use `listTools` to discover available Buildkite MCP tools, then call them with `callTool`.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.buildkite.test.description', {
      defaultMessage:
        'Verifies the connection to Buildkite by listing pipelines in the configured organization.',
    }),
    handler: async (ctx) => {
      return withMcpClient(ctx, async (mcp) => {
        const orgSlug = getOrgSlug(ctx);
        const result = await mcp.callTool({
          name: 'list_pipelines',
          arguments: buildArgs(ctx, { per_page: 1 }),
        });
        const parsed = parseJsonTextFromContentParts(result.content) as
          | { items?: unknown[] }
          | undefined;
        const hasPipelines = (parsed?.items?.length ?? 0) > 0;

        return {
          message: hasPipelines
            ? `Connected to Buildkite organization "${orgSlug}".`
            : `Connected to Buildkite organization "${orgSlug}", but no pipelines were found. Verify the organization slug and that the token can see pipelines.`,
        };
      });
    },
  },
};
