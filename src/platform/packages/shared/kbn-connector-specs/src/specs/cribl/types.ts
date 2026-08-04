/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_STRING_LENGTH = 2000;
const MAX_ID_LENGTH = 200;
const MAX_FILTER_LENGTH = 4000;
const MAX_ROUTES = 200;
const MAX_RECORD_ENTRIES = 100;
const MAX_LOOKUP_CONTENT_CHARS = 5_000_000; // Cribl API requests are capped at 5 MB.
const MAX_PARAMETERS = 50;

export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

const idField = (what: string) => z.string().min(1).max(MAX_ID_LENGTH).describe(what);

const groupNameField = () =>
  z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe(
      'The Worker Group (Stream) or Edge Fleet id/name to target, as returned by listWorkerGroups. ' +
        'Use "default" if the deployment only has a single group.'
    );

// =============================================================================
// request (escape hatch)
// =============================================================================

export const RequestInputSchema = lazySchema(() =>
  z.object({
    method: HttpMethodSchema.describe('The HTTP method to use.'),
    path: z
      .string()
      .max(MAX_STRING_LENGTH)
      .startsWith('/')
      .describe(
        'The Cribl API path relative to /api/v1, starting with a slash, e.g. "/master/groups" or ' +
          '"/m/myGroup/system/inputs". Prefer the typed actions when they fit. Credential, user, and ' +
          'RBAC management endpoints are blocked.'
      ),
    query: z
      .record(z.string().max(200), z.string().max(MAX_STRING_LENGTH))
      .refine((value) => Object.keys(value).length <= MAX_PARAMETERS, {
        message: `query must contain at most ${MAX_PARAMETERS} entries`,
      })
      .optional()
      .describe('Optional query parameters.'),
    // Intentionally unbounded: the request body can be an arbitrary Cribl resource (a full
    // pipeline/route/source config), so its shape can't be constrained here. `z.unknown()`
    // has no size-bounding method to apply; the platform's HTTP layer enforces payload limits.
    body: z.unknown().optional().describe('Optional request body for POST/PUT/PATCH.'),
  })
);
export type RequestInput = z.infer<typeof RequestInputSchema>;

// =============================================================================
// listWorkerGroups
// =============================================================================

export const ListWorkerGroupsInputSchema = lazySchema(() =>
  z.object({
    product: z
      .enum(['stream', 'edge'])
      .optional()
      .describe('Filter to Worker Groups ("stream") or Edge Fleets ("edge"). Omit to list both.'),
  })
);
export type ListWorkerGroupsInput = z.infer<typeof ListWorkerGroupsInputSchema>;

// =============================================================================
// listWorkers
// =============================================================================

export const ListWorkersInputSchema = lazySchema(() => z.object({}));

// =============================================================================
// getHealth
// =============================================================================

export const GetHealthInputSchema = lazySchema(() => z.object({}));

// =============================================================================
// listRoutes / updateRoutes
// =============================================================================

const routeTableIdField = () =>
  z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .default('default')
    .describe(
      'The routing table id. Almost always "default" unless the deployment uses named route sets.'
    );

export const ListRoutesInputSchema = lazySchema(() =>
  z.object({
    groupName: groupNameField(),
    routeId: routeTableIdField(),
  })
);
export type ListRoutesInput = z.infer<typeof ListRoutesInputSchema>;

export const RouteSchema = lazySchema(() =>
  z.object({
    id: idField('Unique id for this route within the table.'),
    name: z.string().max(MAX_ID_LENGTH).optional().describe('Display name for the route.'),
    filter: z
      .string()
      .max(MAX_FILTER_LENGTH)
      .describe(
        'JavaScript boolean expression evaluated against each event to decide whether it matches ' +
          'this route, e.g. "true" (match everything) or "__inputId==\'source_id\'".'
      ),
    pipeline: z
      .string()
      .max(MAX_ID_LENGTH)
      .optional()
      .describe('The pipeline id to send matching events to.'),
    output: z
      .string()
      .max(MAX_ID_LENGTH)
      .optional()
      .describe('The destination id matching events are sent to after pipeline processing.'),
    final: z
      .boolean()
      .optional()
      .describe('When true, matching events stop being evaluated against subsequent routes.'),
    disabled: z.boolean().optional().describe('When true, this route is skipped entirely.'),
    description: z
      .string()
      .max(500)
      .optional()
      .describe('Human-readable description of the route.'),
  })
);
export type Route = z.infer<typeof RouteSchema>;

export const UpdateRoutesInputSchema = lazySchema(() =>
  z.object({
    groupName: groupNameField(),
    routeId: routeTableIdField(),
    routes: z
      .array(RouteSchema)
      .max(MAX_ROUTES)
      .describe(
        'The COMPLETE ordered list of routes for this table. Cribl replaces the entire routing ' +
          'table with this array — it does not merge with the existing table, and any route you ' +
          'omit is deleted. Always call listRoutes first, modify the array you get back, and pass ' +
          'the full modified array here (not just the routes you want to change).'
      ),
  })
);
export type UpdateRoutesInput = z.infer<typeof UpdateRoutesInputSchema>;

// =============================================================================
// commitConfig
// =============================================================================

export const CommitConfigInputSchema = lazySchema(() =>
  z.object({
    message: z
      .string()
      .min(1)
      .max(500)
      .describe('Descriptive commit message recorded in the Cribl Git-backed version history.'),
    group: z
      .string()
      .max(MAX_ID_LENGTH)
      .optional()
      .describe(
        'Limit the commit to pending changes for this Worker Group/Fleet id. Omit to commit ' +
          'pending changes across the whole deployment (e.g. the second commit in the commit → ' +
          'deploy → commit sequence, which keeps the Leader in sync with a Worker Group after deploy).'
      ),
    effective: z
      .boolean()
      .optional()
      .describe('Whether to make this commit the effective (active) version. Defaults to true.'),
  })
);
export type CommitConfigInput = z.infer<typeof CommitConfigInputSchema>;

// =============================================================================
// deployGroup
// =============================================================================

export const DeployGroupInputSchema = lazySchema(() =>
  z.object({
    groupName: groupNameField(),
    version: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9]+$/, 'Must be a commit hash as returned by commitConfig.')
      .describe('The commit hash returned by commitConfig, identifying the version to deploy.'),
  })
);
export type DeployGroupInput = z.infer<typeof DeployGroupInputSchema>;

// =============================================================================
// listPipelines / getPipeline / updatePipeline
// =============================================================================

export const ListPipelinesInputSchema = lazySchema(() =>
  z.object({
    groupName: groupNameField(),
  })
);
export type ListPipelinesInput = z.infer<typeof ListPipelinesInputSchema>;

export const GetPipelineInputSchema = lazySchema(() =>
  z.object({
    groupName: groupNameField(),
    pipelineId: idField('The pipeline id, as returned by listPipelines.'),
  })
);
export type GetPipelineInput = z.infer<typeof GetPipelineInputSchema>;

const configRecord = (maxEntries: number = MAX_RECORD_ENTRIES) =>
  z
    .record(z.string().max(200), z.unknown())
    .refine((value) => Object.keys(value).length <= maxEntries, {
      message: `must contain at most ${maxEntries} entries`,
    });

export const UpdatePipelineInputSchema = lazySchema(() =>
  z.object({
    groupName: groupNameField(),
    pipelineId: idField('The pipeline id, as returned by listPipelines.'),
    conf: configRecord().describe(
      'Fields to merge into the pipeline\'s "conf" object (for example, its "output" or ' +
        '"asyncFuncTimeout"). The current pipeline is fetched and merged automatically, so you only ' +
        'need to pass the fields you want to change. Exception: "conf.functions" is an array and is ' +
        'REPLACED wholesale, not merged element-by-element — if you set it, call getPipeline first and ' +
        'include every function you want to keep, not just the ones you are changing. Note: pipelines ' +
        'have no top-level "disabled" flag in Cribl — to disable a specific function within the ' +
        'pipeline set that function\'s own "disabled: true" inside "conf.functions"; to stop a pipeline ' +
        'from processing data entirely, use updateRoutes to repoint the route at a different pipeline.'
    ),
  })
);
export type UpdatePipelineInput = z.infer<typeof UpdatePipelineInputSchema>;

// =============================================================================
// listSources / updateSource
// =============================================================================

export const ListSourcesInputSchema = lazySchema(() =>
  z.object({
    groupName: groupNameField(),
  })
);
export type ListSourcesInput = z.infer<typeof ListSourcesInputSchema>;

export const UpdateSourceInputSchema = lazySchema(() =>
  z
    .object({
      groupName: groupNameField(),
      sourceId: idField('The source id, as returned by listSources.'),
      disabled: z
        .boolean()
        .optional()
        .describe(
          'Convenience shortcut to stop/resume this Source without needing the rest of its config. ' +
            'true stops data collection; false resumes it.'
        ),
      conf: configRecord()
        .optional()
        .describe(
          'Additional source-type-specific fields to merge into the source config. The current Source ' +
            'is fetched and merged automatically, so you only need to pass the fields you want to change.'
        ),
    })
    .refine((value) => value.disabled !== undefined || value.conf !== undefined, {
      message: 'At least one of "disabled" or "conf" must be provided.',
    })
);
export type UpdateSourceInput = z.infer<typeof UpdateSourceInputSchema>;

// =============================================================================
// listDestinations / updateDestination
// =============================================================================

export const ListDestinationsInputSchema = lazySchema(() =>
  z.object({
    groupName: groupNameField(),
  })
);
export type ListDestinationsInput = z.infer<typeof ListDestinationsInputSchema>;

export const UpdateDestinationInputSchema = lazySchema(() =>
  z
    .object({
      groupName: groupNameField(),
      destinationId: idField('The destination id, as returned by listDestinations.'),
      disabled: z
        .boolean()
        .optional()
        .describe(
          'Convenience shortcut to pause/resume this Destination without needing the rest of its ' +
            'config. true pauses delivery; false resumes it. Use this to fail off a degraded downstream ' +
            'system, or updateRoutes/updatePipeline to fail over to an alternate destination.'
        ),
      conf: configRecord()
        .optional()
        .describe(
          'Additional destination-type-specific fields to merge into the destination config. The ' +
            'current Destination is fetched and merged automatically, so you only need to pass the ' +
            'fields you want to change.'
        ),
    })
    .refine((value) => value.disabled !== undefined || value.conf !== undefined, {
      message: 'At least one of "disabled" or "conf" must be provided.',
    })
);
export type UpdateDestinationInput = z.infer<typeof UpdateDestinationInputSchema>;

// =============================================================================
// restartWorkerGroup
// =============================================================================

export const RestartWorkerGroupInputSchema = lazySchema(() =>
  z.object({
    groupName: groupNameField(),
  })
);
export type RestartWorkerGroupInput = z.infer<typeof RestartWorkerGroupInputSchema>;

// =============================================================================
// runSearch / getSearchResults
// =============================================================================

export const RunSearchInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(MAX_STRING_LENGTH)
      .describe(
        'The Cribl Search query. Must start with the "cribl" operator, e.g. ' +
          '\'cribl dataset="my_dataset" | limit 1000\'. Must be a single line.'
      ),
    groupName: z
      .string()
      .min(1)
      .max(MAX_ID_LENGTH)
      .optional()
      .describe(
        'The Cribl Search group to run the query against, as returned by listWorkerGroups. ' +
          'Defaults to "default_search". Only needed if the deployment has additional Search groups.'
      ),
    earliest: z
      .string()
      .max(100)
      .optional()
      .describe('Start of the search time range, e.g. "-1h", "-15m", or an ISO 8601 timestamp.'),
    latest: z
      .string()
      .max(100)
      .optional()
      .describe('End of the search time range, e.g. "now" or an ISO 8601 timestamp.'),
    sampleRate: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(
        'Sampling ratio to reduce result volume, e.g. 10 samples 1 in 10 events. Default 1 (no sampling).'
      ),
  })
);
export type RunSearchInput = z.infer<typeof RunSearchInputSchema>;

export const GetSearchResultsInputSchema = lazySchema(() =>
  z.object({
    jobId: idField('The search job id returned by runSearch.'),
    groupName: z
      .string()
      .min(1)
      .max(MAX_ID_LENGTH)
      .optional()
      .describe(
        'The Cribl Search group the job was run against, as passed to runSearch. Defaults to ' +
          '"default_search".'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10000)
      .optional()
      .describe('Maximum number of result records to return in this page (default 100).'),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Number of result records to skip, for paginating through a large result set (default 0).'
      ),
  })
);
export type GetSearchResultsInput = z.infer<typeof GetSearchResultsInputSchema>;

// =============================================================================
// updateLookup
// =============================================================================

export const UpdateLookupInputSchema = lazySchema(() =>
  z.object({
    groupName: groupNameField(),
    lookupId: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[A-Za-z0-9._-]+$/, 'Must be a plain lookup filename, e.g. "blocklist.csv".')
      .describe(
        'The lookup file id/filename. If it does not already exist, it is created; otherwise its ' +
          'contents are replaced.'
      ),
    content: z
      .string()
      .min(1)
      .max(MAX_LOOKUP_CONTENT_CHARS)
      .describe(
        'The full contents of the lookup file (e.g. CSV rows including a header row). If the lookup ' +
          'already exists, this replaces its current contents entirely.'
      ),
    contentType: z
      .enum(['text/csv', 'application/json'])
      .optional()
      .describe('The MIME type of "content". Defaults to "text/csv".'),
  })
);
export type UpdateLookupInput = z.infer<typeof UpdateLookupInputSchema>;
