/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Jenkins Connector
 *
 * Talks to the Jenkins Remote Access API so workflows and agents can trigger
 * builds, follow them to completion, gather evidence (console log, test
 * report), and mitigate a bad job (stop, disable, quiet-down).
 *
 * https://www.jenkins.io/doc/book/using/remote-access-api/
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { UISchemas } from '../../connector_spec_ui';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  RequestInputSchema,
  TriggerBuildInputSchema,
  TriggerBuildWithParametersInputSchema,
  GetQueueItemInputSchema,
  GetBuildInputSchema,
  GetConsoleLogInputSchema,
  StopBuildInputSchema,
  GetLastBuildInputSchema,
  ListJobsInputSchema,
  GetJobInputSchema,
  ListBuildsInputSchema,
  GetBuildTestReportInputSchema,
  DisableJobInputSchema,
  EnableJobInputSchema,
  GetQueueInputSchema,
  QuietDownInputSchema,
  CancelQuietDownInputSchema,
} from './types';
import type {
  RequestInput,
  HttpMethod,
  TriggerBuildInput,
  TriggerBuildWithParametersInput,
  GetQueueItemInput,
  GetBuildInput,
  GetConsoleLogInput,
  StopBuildInput,
  GetLastBuildInput,
  GetJobInput,
  ListBuildsInput,
  GetBuildTestReportInput,
  DisableJobInput,
  EnableJobInput,
} from './types';

// =============================================================================
// Constants
// =============================================================================

/** Cap console log output so it stays within an agent-safe context size. */
const MAX_CONSOLE_LOG_CHARS = 20000;

/** Cap error body/detail text pulled from a failed response. */
const MAX_ERROR_DETAIL_CHARS = 500;

/** Cap the number of failing test cases returned by getBuildTestReport. */
const MAX_FAILING_TESTS = 50;

/** Cap a single failing test's error message. */
const MAX_ERROR_MESSAGE_CHARS = 500;

const DEFAULT_LIST_BUILDS_LIMIT = 20;

const JOB_SUMMARY_TREE = 'name,url,color,buildable,lastBuild[number,url,timestamp,result]';
const JOB_DETAIL_TREE =
  'name,url,color,buildable,description,' +
  'lastBuild[number,url,timestamp,result],' +
  'lastSuccessfulBuild[number,url],lastFailedBuild[number,url],' +
  'property[parameterDefinitions[name,type,description,defaultParameterValue[value]]]';
const BUILD_TREE =
  'number,url,displayName,building,result,timestamp,duration,estimatedDuration,description';
const QUEUE_ITEM_TREE =
  'id,blocked,buildable,stuck,cancelled,why,task[name,url],executable[number,url]';

/**
 * Endpoints that must never be reachable via this connector, regardless of the
 * calling action (typed action or the generic `request` escape hatch): the
 * Groovy script console (arbitrary code execution), the credentials store,
 * security realm / authorization configuration, the plugin manager (installing
 * a plugin is also arbitrary code execution), and instance restart/shutdown.
 */
const BLOCKED_PATH_PREFIXES = [
  '/script',
  '/scripttext',
  '/credentials',
  '/securityrealm',
  '/configuresecurity',
  '/manage/configuresecurity',
  '/pluginmanager',
  '/manage/pluginmanager',
  '/restart',
  '/saferestart',
  '/exit',
] as const;

// =============================================================================
// Lightweight Jenkins shapes (only the fields we read)
// =============================================================================

interface JenkinsBuildRef {
  number?: number;
  url?: string;
}

interface JenkinsBuildSummary extends JenkinsBuildRef {
  displayName?: string;
  building?: boolean;
  result?: string | null;
  timestamp?: number;
  duration?: number;
  estimatedDuration?: number;
  description?: string | null;
}

interface JenkinsJobSummary {
  name?: string;
  url?: string;
  color?: string;
  buildable?: boolean;
  lastBuild?: JenkinsBuildSummary | null;
}

interface JenkinsParameterDefinition {
  name?: string;
  type?: string;
  description?: string;
  defaultParameterValue?: { value?: unknown };
}

interface JenkinsJobProperty {
  parameterDefinitions?: JenkinsParameterDefinition[];
}

interface JenkinsJobDetail extends JenkinsJobSummary {
  description?: string | null;
  lastSuccessfulBuild?: JenkinsBuildRef | null;
  lastFailedBuild?: JenkinsBuildRef | null;
  property?: JenkinsJobProperty[];
}

interface JenkinsJobList {
  jobs?: JenkinsJobSummary[];
}

interface JenkinsBuildList {
  builds?: JenkinsBuildSummary[];
}

interface JenkinsQueueItem {
  id?: number;
  blocked?: boolean;
  buildable?: boolean;
  stuck?: boolean;
  cancelled?: boolean;
  why?: string | null;
  task?: { name?: string; url?: string };
  executable?: JenkinsBuildRef | null;
}

interface JenkinsQueueList {
  items?: JenkinsQueueItem[];
}

interface JenkinsTestCase {
  className?: string;
  name?: string;
  status?: string;
  errorDetails?: string | null;
}

interface JenkinsTestSuite {
  name?: string;
  cases?: JenkinsTestCase[];
}

interface JenkinsTestReport {
  failCount?: number;
  passCount?: number;
  skipCount?: number;
  duration?: number;
  suites?: JenkinsTestSuite[];
}

interface JenkinsWhoAmI {
  name?: string;
  authenticated?: boolean;
  anonymous?: boolean;
}

interface JenkinsRequestOptions {
  method: HttpMethod;
  path: string;
  params?: Record<string, string>;
  data?: unknown;
  headers?: Record<string, string>;
  responseType?: 'json' | 'text';
}

// =============================================================================
// Security guardrails
// =============================================================================

/**
 * Decodes percent-encoding and collapses `.`/`..` segments so guard checks compare
 * against the effective resolved path rather than the wire form (see the Ansible
 * Controller connector for the URL-encoding bypass this pattern closes).
 */
const normalizePathForGuards = (path: string): string => {
  const pathOnly = path.split(/[?#]/, 1)[0] ?? path;
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathOnly);
  } catch {
    throw new Error('Jenkins API path contains invalid percent-encoding');
  }
  const segments: string[] = [];
  for (const segment of decoded.split('/')) {
    if (segment === '' || segment === '.') {
      continue;
    }
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return `/${segments.join('/')}`.toLowerCase();
};

const assertPathAllowed = (path: string): void => {
  if (!path.startsWith('/')) {
    throw new Error('Jenkins API path must start with "/"');
  }
  const normalized = normalizePathForGuards(path);
  for (const prefix of BLOCKED_PATH_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      throw new Error(`Requests to "${prefix}" are not permitted via this connector`);
    }
  }
};

// =============================================================================
// Helpers
// =============================================================================

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

const stripHtml = (input: string): string =>
  input
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Turns an Axios / Jenkins error into a readable Error. */
const normalizeJenkinsError = (error: unknown): Error => {
  const response = (
    error as { response?: { status?: number; data?: unknown; headers?: Record<string, unknown> } }
  )?.response;
  const status = response?.status;
  const data = response?.data;

  let detail: string | undefined;
  if (typeof data === 'string' && data.trim().length > 0) {
    detail = stripHtml(data).slice(0, MAX_ERROR_DETAIL_CHARS);
  } else if (data && typeof data === 'object') {
    const body = data as { message?: unknown };
    detail = typeof body.message === 'string' ? body.message : undefined;
  }
  if (!detail) {
    const xError = response?.headers?.['x-error'];
    detail = typeof xError === 'string' ? xError : undefined;
  }

  if (typeof status === 'number') {
    return new Error(`Jenkins API error (${status})${detail ? `: ${detail}` : ''}`);
  }
  return error instanceof Error ? error : new Error(String(error));
};

/** Central request helper: resolves the URL, applies guards, normalizes errors. */
const jenkinsRequest = async (
  ctx: ActionContext,
  options: JenkinsRequestOptions
): Promise<AxiosResponse> => {
  assertPathAllowed(options.path);
  const { baseUrl } = ctx.config as { baseUrl: string };
  const client = ctx.client as AxiosInstance;
  try {
    return await client.request({
      method: options.method,
      url: `${stripTrailingSlash(baseUrl)}${options.path}`,
      ...(options.params ? { params: options.params } : {}),
      ...(options.data !== undefined ? { data: options.data } : {}),
      ...(options.headers ? { headers: options.headers } : {}),
      ...(options.responseType ? { responseType: options.responseType } : {}),
      // Jenkins' "form action" endpoints (stop, disable, enable, quietDown,
      // cancelQuietDown, ...) respond 302 to the resulting page instead of 200. Do
      // not let axios auto-follow: axios attaches Basic-Auth via the low-level
      // `auth` request option (not a header), and follow-redirects overwrites that
      // option with the redirect target's (credential-less) URL fields, silently
      // dropping our credentials on the follow-up request and turning a successful
      // action into a 403. We don't need the redirect target's body anyway, so
      // treat any redirect as a successful response instead of following it.
      maxRedirects: 0,
      validateStatus: (status) =>
        (status >= 200 && status < 300) || (status >= 300 && status < 400),
    });
  } catch (error) {
    throw normalizeJenkinsError(error);
  }
};

const QUEUE_ITEM_URL_RE = /\/queue\/item\/(\d+)\/?/;

/** Extracts the queue item id from the `Location` header of a trigger response. */
const extractQueueId = (response: AxiosResponse): { queueId: number; queueUrl: string } => {
  const location = response.headers?.location ?? response.headers?.Location;
  if (typeof location !== 'string') {
    throw new Error('Jenkins did not return a queue item Location header for the triggered build');
  }
  const match = location.match(QUEUE_ITEM_URL_RE);
  if (!match) {
    throw new Error(`Could not parse a queue item id from Location header: ${location}`);
  }
  return { queueId: Number(match[1]), queueUrl: location };
};

const toIso = (epochMs?: number): string | undefined =>
  typeof epochMs === 'number' ? new Date(epochMs).toISOString() : undefined;

const JOB_STATUS_BY_BASE_COLOR: Record<string, string> = {
  blue: 'success',
  green: 'success',
  red: 'failed',
  yellow: 'unstable',
  grey: 'not_built',
  notbuilt: 'not_built',
  aborted: 'aborted',
  disabled: 'disabled',
};

const ANIME_SUFFIX = '_anime';

/** Jenkins encodes job health as a "color" ball; decode it into a friendlier status. */
const describeJobStatus = (color?: string): { status: string; building: boolean } => {
  if (!color) {
    return { status: 'unknown', building: false };
  }
  const building = color.endsWith(ANIME_SUFFIX);
  const base = building ? color.slice(0, -ANIME_SUFFIX.length) : color;
  return { status: JOB_STATUS_BY_BASE_COLOR[base] ?? base, building };
};

const slimBuildRef = (build?: JenkinsBuildRef | null) =>
  build ? { number: build.number, url: build.url } : undefined;

const slimBuild = (build: JenkinsBuildSummary) => ({
  number: build.number,
  url: build.url,
  displayName: build.displayName,
  building: build.building ?? false,
  result: build.result ?? null,
  timestamp: toIso(build.timestamp),
  durationMs: build.duration,
  estimatedDurationMs: build.estimatedDuration,
  ...(build.description ? { description: build.description } : {}),
});

const slimJobSummary = (job: JenkinsJobSummary) => {
  const { status, building } = describeJobStatus(job.color);
  return {
    name: job.name,
    url: job.url,
    buildable: job.buildable,
    status,
    building,
    ...(job.lastBuild ? { lastBuild: slimBuild(job.lastBuild) } : {}),
  };
};

const extractJobParameters = (job: JenkinsJobDetail) => {
  const props = Array.isArray(job.property) ? job.property : [];
  const definitions = props.flatMap((property) =>
    Array.isArray(property.parameterDefinitions) ? property.parameterDefinitions : []
  );
  if (definitions.length === 0) {
    return undefined;
  }
  return definitions.map((definition) => ({
    name: definition.name,
    type: definition.type,
    ...(definition.description ? { description: definition.description } : {}),
    ...(definition.defaultParameterValue?.value !== undefined
      ? { defaultValue: definition.defaultParameterValue.value }
      : {}),
  }));
};

const slimJobDetail = (job: JenkinsJobDetail) => {
  const parameters = extractJobParameters(job);
  return {
    ...slimJobSummary(job),
    ...(job.description ? { description: job.description } : {}),
    ...(job.lastSuccessfulBuild
      ? { lastSuccessfulBuild: slimBuildRef(job.lastSuccessfulBuild) }
      : {}),
    ...(job.lastFailedBuild ? { lastFailedBuild: slimBuildRef(job.lastFailedBuild) } : {}),
    ...(parameters ? { parameters } : {}),
  };
};

const slimQueueItem = (item: JenkinsQueueItem) => ({
  id: item.id,
  blocked: item.blocked ?? false,
  buildable: item.buildable ?? false,
  stuck: item.stuck ?? false,
  cancelled: item.cancelled ?? false,
  why: item.why ?? null,
  task: item.task ? { name: item.task.name, url: item.task.url } : undefined,
  ...(item.executable ? { build: slimBuildRef(item.executable) } : {}),
});

const FAILING_TEST_STATUSES = new Set(['FAILED', 'REGRESSION']);

const slimTestReport = (report: JenkinsTestReport) => {
  const suites = Array.isArray(report.suites) ? report.suites : [];
  const failing: Array<{
    suite?: string;
    className?: string;
    name?: string;
    status?: string;
    errorDetails?: string;
  }> = [];

  for (const suite of suites) {
    for (const testCase of suite.cases ?? []) {
      if (testCase.status && FAILING_TEST_STATUSES.has(testCase.status)) {
        failing.push({
          suite: suite.name,
          className: testCase.className,
          name: testCase.name,
          status: testCase.status,
          ...(testCase.errorDetails
            ? { errorDetails: testCase.errorDetails.slice(0, MAX_ERROR_MESSAGE_CHARS) }
            : {}),
        });
      }
    }
  }

  const truncated = failing.length > MAX_FAILING_TESTS;
  return {
    passCount: report.passCount ?? 0,
    failCount: report.failCount ?? 0,
    skipCount: report.skipCount ?? 0,
    durationSec: report.duration,
    failingTests: truncated ? failing.slice(0, MAX_FAILING_TESTS) : failing,
    failingTestsTruncated: truncated,
  };
};

// =============================================================================
// Connector spec
// =============================================================================

export const Jenkins: ConnectorSpec = {
  metadata: {
    id: '.jenkins',
    displayName: 'Jenkins',
    description: i18n.translate('core.kibanaConnectorSpecs.jenkins.metadata.description', {
      defaultMessage:
        'Trigger, monitor, and stop Jenkins builds, and manage jobs, test reports, and the build queue',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'basic',
        isRecommended: true,
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.jenkins.auth.basic.label', {
            defaultMessage: 'Username and API token',
          }),
          meta: {
            username: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.jenkins.auth.basic.usernameHelpText',
                {
                  defaultMessage:
                    'The Jenkins account username that every connector action runs as.',
                }
              ),
            },
            password: {
              label: i18n.translate('core.kibanaConnectorSpecs.jenkins.auth.basic.passwordLabel', {
                defaultMessage: 'API token',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.jenkins.auth.basic.passwordHelpText',
                {
                  defaultMessage:
                    'Generate a token from the user profile page in Jenkins (click your name, then ' +
                    '"Security", then "Add new Token"). Use an API token, not the account password — ' +
                    'this connector relies on Jenkins exempting token-authenticated requests from CSRF ' +
                    'crumb checks, which does not apply to password authentication.',
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
      baseUrl: UISchemas.url('https://jenkins.example.com')
        .describe('The base URL of the Jenkins controller (no trailing slash needed).')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.jenkins.config.baseUrl.label', {
            defaultMessage: 'Jenkins URL',
          }),
          validate: { allowedHosts: true },
        }),
    })
  ),

  actions: {
    request: {
      isTool: true,
      description:
        'Make an authenticated request to any Jenkins API path. Prefer the typed actions ' +
        '(triggerBuild, getBuild, listJobs, etc.) when they fit. The Groovy script console, ' +
        'credentials store, security realm configuration, plugin manager, and instance ' +
        'restart endpoints are blocked.',
      input: RequestInputSchema,
      handler: async (ctx, input: RequestInput) => {
        const response = await jenkinsRequest(ctx, {
          method: input.method,
          path: input.path,
          params: input.query,
          data: input.body,
        });
        return response.data;
      },
    },

    triggerBuild: {
      isTool: true,
      description:
        'Trigger a build of an unparameterized Jenkins job. Returns a queue item id and URL — ' +
        'not a build number yet, since Jenkins queues the build first. Pass the queueId to ' +
        'getQueueItem to resolve the eventual build number once the build starts.',
      input: TriggerBuildInputSchema,
      handler: async (ctx, input: TriggerBuildInput) => {
        const response = await jenkinsRequest(ctx, {
          method: 'POST',
          path: `/job/${encodeURIComponent(input.jobName)}/build`,
        });
        return extractQueueId(response);
      },
    },

    triggerBuildWithParameters: {
      isTool: true,
      description:
        'Trigger a build of a parameterized Jenkins job with named build parameters. Use getJob ' +
        'first to see the parameter names and types the job expects. Returns a queue item id and ' +
        'URL, like triggerBuild — pass the queueId to getQueueItem to resolve the build number.',
      input: TriggerBuildWithParametersInputSchema,
      handler: async (ctx, input: TriggerBuildWithParametersInput) => {
        const response = await jenkinsRequest(ctx, {
          method: 'POST',
          path: `/job/${encodeURIComponent(input.jobName)}/buildWithParameters`,
          data: new URLSearchParams(input.parameters).toString(),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        return extractQueueId(response);
      },
    },

    getQueueItem: {
      isTool: true,
      description:
        'Resolve a queue item (returned by triggerBuild / triggerBuildWithParameters) to its ' +
        'eventual build. Returns `build.number` once Jenkins has started the build, or `blocked` / ' +
        '`why` while it is still waiting (e.g. for an executor). Poll this until `build` is present.',
      input: GetQueueItemInputSchema,
      handler: async (ctx, input: GetQueueItemInput) => {
        const response = await jenkinsRequest(ctx, {
          method: 'GET',
          path: `/queue/item/${input.queueId}/api/json`,
          params: { tree: QUEUE_ITEM_TREE },
        });
        return slimQueueItem(response.data as JenkinsQueueItem);
      },
    },

    getBuild: {
      isTool: true,
      description:
        'Read a specific build of a job: result, whether it is still building, timestamp, and ' +
        'duration. The step a workflow polls to learn whether a triggered build finished and passed.',
      input: GetBuildInputSchema,
      handler: async (ctx, input: GetBuildInput) => {
        const response = await jenkinsRequest(ctx, {
          method: 'GET',
          path: `/job/${encodeURIComponent(input.jobName)}/${input.buildNumber}/api/json`,
          params: { tree: BUILD_TREE },
        });
        return slimBuild(response.data as JenkinsBuildSummary);
      },
    },

    getConsoleLog: {
      isTool: true,
      description:
        'Fetch the console output of a build, for triage or attaching failure detail to a case. ' +
        `Output is capped to the last ${MAX_CONSOLE_LOG_CHARS} characters.`,
      input: GetConsoleLogInputSchema,
      output: lazySchema(() =>
        z.object({
          content: z.string().describe('The (possibly truncated) console output.'),
          truncated: z.boolean().describe('Whether the output was truncated to fit the size cap.'),
        })
      ),
      handler: async (ctx, input: GetConsoleLogInput) => {
        const response = await jenkinsRequest(ctx, {
          method: 'GET',
          path: `/job/${encodeURIComponent(input.jobName)}/${input.buildNumber}/consoleText`,
          responseType: 'text',
        });
        const raw = typeof response.data === 'string' ? response.data : String(response.data);
        const truncated = raw.length > MAX_CONSOLE_LOG_CHARS;
        return {
          content: truncated ? raw.slice(raw.length - MAX_CONSOLE_LOG_CHARS) : raw,
          truncated,
        };
      },
    },

    stopBuild: {
      isTool: true,
      description:
        'Abort a running build, letting a workflow halt a bad or runaway pipeline. The build ' +
        'transitions to ABORTED asynchronously — poll getBuild afterwards to confirm it stopped.',
      input: StopBuildInputSchema,
      handler: async (ctx, input: StopBuildInput) => {
        await jenkinsRequest(ctx, {
          method: 'POST',
          path: `/job/${encodeURIComponent(input.jobName)}/${input.buildNumber}/stop`,
        });
        return { message: `Stop request sent for "${input.jobName}" build #${input.buildNumber}` };
      },
    },

    getLastBuild: {
      isTool: true,
      description:
        'Read the most recent build of a job (result, number, in-progress flag) — a quick pipeline ' +
        'health check without knowing the build number.',
      input: GetLastBuildInputSchema,
      handler: async (ctx, input: GetLastBuildInput) => {
        const response = await jenkinsRequest(ctx, {
          method: 'GET',
          path: `/job/${encodeURIComponent(input.jobName)}/lastBuild/api/json`,
          params: { tree: BUILD_TREE },
        });
        return slimBuild(response.data as JenkinsBuildSummary);
      },
    },

    listJobs: {
      isTool: true,
      description:
        'List the jobs on the Jenkins instance with name, URL, and last-build status. Use this to ' +
        'discover or confirm a job name before acting on it.',
      input: ListJobsInputSchema,
      handler: async (ctx) => {
        const response = await jenkinsRequest(ctx, {
          method: 'GET',
          path: '/api/json',
          params: { tree: `jobs[${JOB_SUMMARY_TREE}]` },
        });
        const jobs = (response.data as JenkinsJobList).jobs ?? [];
        return { jobCount: jobs.length, jobs: jobs.map(slimJobSummary) };
      },
    },

    getJob: {
      isTool: true,
      description:
        'Read a single job: description, buildable/status, last/lastSuccessful/lastFailed build ' +
        'pointers, and its build parameter definitions (name, type, default value). Call this ' +
        'before triggerBuildWithParameters to see what parameters the job expects.',
      input: GetJobInputSchema,
      handler: async (ctx, input: GetJobInput) => {
        const response = await jenkinsRequest(ctx, {
          method: 'GET',
          path: `/job/${encodeURIComponent(input.jobName)}/api/json`,
          params: { tree: JOB_DETAIL_TREE },
        });
        return slimJobDetail(response.data as JenkinsJobDetail);
      },
    },

    listBuilds: {
      isTool: true,
      description:
        'List recent builds of a job with results and timestamps — used to summarize pipeline ' +
        'health or find a specific run.',
      input: ListBuildsInputSchema,
      handler: async (ctx, input: ListBuildsInput) => {
        const limit = input.limit ?? DEFAULT_LIST_BUILDS_LIMIT;
        const response = await jenkinsRequest(ctx, {
          method: 'GET',
          path: `/job/${encodeURIComponent(input.jobName)}/api/json`,
          params: { tree: `builds[number,url,timestamp,result,duration]{0,${limit}}` },
        });
        const builds = (response.data as JenkinsBuildList).builds ?? [];
        return { buildCount: builds.length, builds: builds.map(slimBuild) };
      },
    },

    getBuildTestReport: {
      isTool: true,
      description:
        'Read the parsed test report for a build (pass/fail/skip counts and failing test cases), ' +
        `turning a raw pipeline result into structured triage data. Failing tests are capped to ` +
        `${MAX_FAILING_TESTS}. Throws if the build has no test report (e.g. no test action ran).`,
      input: GetBuildTestReportInputSchema,
      handler: async (ctx, input: GetBuildTestReportInput) => {
        const response = await jenkinsRequest(ctx, {
          method: 'GET',
          path: `/job/${encodeURIComponent(input.jobName)}/${
            input.buildNumber
          }/testReport/api/json`,
        });
        return slimTestReport(response.data as JenkinsTestReport);
      },
    },

    disableJob: {
      isTool: true,
      description:
        'Disable a job so no new builds start for it — quarantines a misbehaving pipeline during ' +
        'an incident. Pair with enableJob to recover.',
      input: DisableJobInputSchema,
      handler: async (ctx, input: DisableJobInput) => {
        await jenkinsRequest(ctx, {
          method: 'POST',
          path: `/job/${encodeURIComponent(input.jobName)}/disable`,
        });
        return { message: `Disabled job "${input.jobName}"` };
      },
    },

    enableJob: {
      isTool: true,
      description: 'Re-enable a previously disabled job so it can run again.',
      input: EnableJobInputSchema,
      handler: async (ctx, input: EnableJobInput) => {
        await jenkinsRequest(ctx, {
          method: 'POST',
          path: `/job/${encodeURIComponent(input.jobName)}/enable`,
        });
        return { message: `Enabled job "${input.jobName}"` };
      },
    },

    getQueue: {
      isTool: true,
      description:
        'Read the full Jenkins build queue, so a workflow can see pending work and detect backlog ' +
        'before triggering more builds.',
      input: GetQueueInputSchema,
      handler: async (ctx) => {
        const response = await jenkinsRequest(ctx, {
          method: 'GET',
          path: '/queue/api/json',
          params: { tree: `items[${QUEUE_ITEM_TREE}]` },
        });
        const items = (response.data as JenkinsQueueList).items ?? [];
        return { itemCount: items.length, items: items.map(slimQueueItem) };
      },
    },

    quietDown: {
      isTool: true,
      description:
        'Put the whole Jenkins instance in quiet-down mode: no new builds start across any job. ' +
        'A heavy, instance-wide mitigation for freezing all pipelines during an incident — prefer ' +
        'disableJob for a single misbehaving job. Pair with cancelQuietDown to resume.',
      input: QuietDownInputSchema,
      handler: async (ctx) => {
        await jenkinsRequest(ctx, { method: 'POST', path: '/quietDown' });
        return { message: 'Jenkins instance is now in quiet-down mode; no new builds will start' };
      },
    },

    cancelQuietDown: {
      isTool: true,
      description: 'Cancel quiet-down mode so builds can start again across the instance.',
      input: CancelQuietDownInputSchema,
      handler: async (ctx) => {
        await jenkinsRequest(ctx, { method: 'POST', path: '/cancelQuietDown' });
        return { message: 'Quiet-down mode cancelled; builds can start again' };
      },
    },
  },

  skill: [
    'Jenkins connector — usage guidance for LLMs.',
    '',
    '## Trigger → resolve → poll',
    '1. triggerBuild (or triggerBuildWithParameters) — returns a queueId, not a build number.',
    '2. getQueueItem with that queueId — poll until `build` appears (Jenkins may hold a build in ' +
      'the queue if no executor is free, or discard it as `cancelled`).',
    '3. getBuild with the resolved job name and build number — poll until `building` is false, ' +
      'then read `result` (SUCCESS, FAILURE, UNSTABLE, ABORTED, or null while still running).',
    '',
    '## Evidence gathering',
    'Use getConsoleLog for raw output, or getBuildTestReport for structured pass/fail counts and ' +
      'failing test cases when the job publishes JUnit-style results.',
    '',
    '## Discovery',
    'Use listJobs to find a job name, then getJob to see its parameters before calling ' +
      'triggerBuildWithParameters, or getLastBuild for a quick health check without a build number.',
    '',
    '## Mitigation',
    'stopBuild aborts one build. disableJob/enableJob quarantines or recovers one job. ' +
      'quietDown/cancelQuietDown freeze or resume the entire instance — reserve for wide incidents.',
    '',
    '## Scope',
    'This connector targets top-level jobs, not jobs nested in folders (Folders plugin).',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.jenkins.test.description', {
      defaultMessage: 'Verifies connectivity and credentials by calling the Jenkins whoAmI API',
    }),
    handler: async (ctx) => {
      const response = await jenkinsRequest(ctx, { method: 'GET', path: '/whoAmI/api/json' });
      const data = response.data as JenkinsWhoAmI;
      if (!data?.authenticated || data.anonymous) {
        throw new Error('Jenkins did not recognize the provided username and API token');
      }
      return { message: `Successfully connected to Jenkins as "${data.name}"` };
    },
  },
};
