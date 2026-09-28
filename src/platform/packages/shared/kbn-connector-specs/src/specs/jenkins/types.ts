/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_STRING_LENGTH = 2048;
const MAX_JOB_NAME_LENGTH = 256;
const MAX_PARAMETERS = 50;

export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const RequestInputSchema = lazySchema(() =>
  z.object({
    method: HttpMethodSchema.describe('The HTTP method to use.'),
    path: z
      .string()
      .max(MAX_STRING_LENGTH)
      .startsWith('/')
      .describe(
        'The Jenkins API path, starting with a slash. Prefer the typed actions (triggerBuild, ' +
          'getBuild, listJobs, etc.) when they fit; use this only for endpoints they do not cover, ' +
          'e.g. "/job/my-job/config.xml" or "/computer/api/json". Do not include the host — it ' +
          'comes from the connector configuration. The Groovy script console, credentials store, ' +
          'security realm configuration, plugin manager, and instance restart endpoints are blocked.'
      ),
    query: z
      .record(z.string().max(200), z.string().max(MAX_STRING_LENGTH))
      .refine((value) => Object.keys(value).length <= MAX_PARAMETERS, {
        message: `query must contain at most ${MAX_PARAMETERS} entries`,
      })
      .optional()
      .describe('Optional query parameters, e.g. { "tree": "jobs[name,url]" }.'),
    body: z.unknown().optional().describe('Optional request body for POST/PUT/PATCH.'),
  })
);
export type RequestInput = z.infer<typeof RequestInputSchema>;

const jobNameField = () =>
  z
    .string()
    .min(1)
    .max(MAX_JOB_NAME_LENGTH)
    .describe(
      'The Jenkins job (project) name, exactly as it appears in the Jenkins UI. This connector ' +
        'targets top-level jobs only — folder-nested jobs (Folders plugin) are not supported.'
    );

const buildNumberField = () =>
  z
    .number()
    .int()
    .positive()
    .describe('The build number for the job, e.g. as returned by getLastBuild or listBuilds.');

export const TriggerBuildInputSchema = lazySchema(() =>
  z.object({
    jobName: jobNameField(),
  })
);
export type TriggerBuildInput = z.infer<typeof TriggerBuildInputSchema>;

export const TriggerBuildWithParametersInputSchema = lazySchema(() =>
  z.object({
    jobName: jobNameField(),
    parameters: z
      .record(z.string().max(200), z.string().max(MAX_STRING_LENGTH))
      .refine((value) => Object.keys(value).length <= MAX_PARAMETERS, {
        message: `parameters must contain at most ${MAX_PARAMETERS} entries`,
      })
      .describe(
        'Build parameter name/value pairs, matching the parameter names defined on the Jenkins ' +
          'job (see getJob). All values are sent as strings, so booleans and numbers must be ' +
          'stringified, e.g. { "DEPLOY": "true", "RETRIES": "3" }.'
      ),
  })
);
export type TriggerBuildWithParametersInput = z.infer<typeof TriggerBuildWithParametersInputSchema>;

export const GetQueueItemInputSchema = lazySchema(() =>
  z.object({
    queueId: z
      .number()
      .int()
      .nonnegative()
      .describe('The queue item id returned by triggerBuild or triggerBuildWithParameters.'),
  })
);
export type GetQueueItemInput = z.infer<typeof GetQueueItemInputSchema>;

export const GetBuildInputSchema = lazySchema(() =>
  z.object({
    jobName: jobNameField(),
    buildNumber: buildNumberField(),
  })
);
export type GetBuildInput = z.infer<typeof GetBuildInputSchema>;

export const GetConsoleLogInputSchema = lazySchema(() =>
  z.object({
    jobName: jobNameField(),
    buildNumber: buildNumberField(),
  })
);
export type GetConsoleLogInput = z.infer<typeof GetConsoleLogInputSchema>;

export const StopBuildInputSchema = lazySchema(() =>
  z.object({
    jobName: jobNameField(),
    buildNumber: buildNumberField(),
  })
);
export type StopBuildInput = z.infer<typeof StopBuildInputSchema>;

export const GetLastBuildInputSchema = lazySchema(() =>
  z.object({
    jobName: jobNameField(),
  })
);
export type GetLastBuildInput = z.infer<typeof GetLastBuildInputSchema>;

export const ListJobsInputSchema = lazySchema(() => z.object({}));
export type ListJobsInput = z.infer<typeof ListJobsInputSchema>;

export const GetJobInputSchema = lazySchema(() =>
  z.object({
    jobName: jobNameField(),
  })
);
export type GetJobInput = z.infer<typeof GetJobInputSchema>;

export const ListBuildsInputSchema = lazySchema(() =>
  z.object({
    jobName: jobNameField(),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of recent builds to return (1-100, default 20).'),
  })
);
export type ListBuildsInput = z.infer<typeof ListBuildsInputSchema>;

export const GetBuildTestReportInputSchema = lazySchema(() =>
  z.object({
    jobName: jobNameField(),
    buildNumber: buildNumberField(),
  })
);
export type GetBuildTestReportInput = z.infer<typeof GetBuildTestReportInputSchema>;

export const DisableJobInputSchema = lazySchema(() =>
  z.object({
    jobName: jobNameField(),
  })
);
export type DisableJobInput = z.infer<typeof DisableJobInputSchema>;

export const EnableJobInputSchema = lazySchema(() =>
  z.object({
    jobName: jobNameField(),
  })
);
export type EnableJobInput = z.infer<typeof EnableJobInputSchema>;

export const GetQueueInputSchema = lazySchema(() => z.object({}));
export type GetQueueInput = z.infer<typeof GetQueueInputSchema>;

export const QuietDownInputSchema = lazySchema(() => z.object({}));
export type QuietDownInput = z.infer<typeof QuietDownInputSchema>;

export const CancelQuietDownInputSchema = lazySchema(() => z.object({}));
export type CancelQuietDownInput = z.infer<typeof CancelQuietDownInputSchema>;
