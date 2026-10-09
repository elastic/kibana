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
        'The Argo CD API path, starting with a slash. Typically under /api/v1/. ' +
          'Examples: "/api/v1/applications", "/api/v1/applications/my-app", "/api/v1/session/userinfo". ' +
          'Do not include the host — it comes from the connector configuration.'
      ),
    query: z
      .record(z.string().max(MAX_STRING_LENGTH), z.string().max(MAX_STRING_LENGTH))
      .optional()
      .describe('Optional query parameters, e.g. { project: "default" } or { refresh: "hard" }.'),
    body: z.unknown().optional().describe('Optional request body for POST/PUT/PATCH.'),
  })
);
export type RequestInput = z.infer<typeof RequestInputSchema>;

export const ListApplicationsInputSchema = lazySchema(() =>
  z.object({
    projects: z
      .array(z.string().max(MAX_STRING_LENGTH))
      .optional()
      .describe('Filter by one or more AppProject names (query: projects).'),
    project: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe(
        'Filter by a single AppProject name. Prefer this when using a project-scoped token.'
      ),
    selector: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Label selector to filter applications, e.g. "team=platform".'),
    name: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Filter by application name (substring match).'),
    repo: z.string().max(MAX_STRING_LENGTH).optional().describe('Filter by repository URL.'),
    appNamespace: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Filter by the Application CR namespace (appNamespace).'),
  })
);
export type ListApplicationsInput = z.infer<typeof ListApplicationsInputSchema>;

export const GetApplicationInputSchema = lazySchema(() =>
  z.object({
    name: z.string().max(MAX_STRING_LENGTH).describe('The Argo CD application name.'),
    project: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe(
        'AppProject name. Pass this when using a project-scoped token so Argo CD returns 404 vs 403 correctly.'
      ),
    appNamespace: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('The Application CR namespace when using app-of-apps namespaces.'),
    refresh: z
      .enum(['normal', 'hard'])
      .optional()
      .describe(
        'When set, forces a refresh of the application from Git before returning. ' +
          '"normal" refreshes caches; "hard" forces a full refresh. This is not a sync.'
      ),
  })
);
export type GetApplicationInput = z.infer<typeof GetApplicationInputSchema>;

export const GetResourceTreeInputSchema = lazySchema(() =>
  z.object({
    name: z.string().max(MAX_STRING_LENGTH).describe('The Argo CD application name.'),
    appNamespace: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('The Application CR namespace when using app-of-apps namespaces.'),
  })
);
export type GetResourceTreeInput = z.infer<typeof GetResourceTreeInputSchema>;

export const ListApplicationEventsInputSchema = lazySchema(() =>
  z.object({
    name: z.string().max(MAX_STRING_LENGTH).describe('The Argo CD application name.'),
    resourceNamespace: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Optional Kubernetes namespace of the resource whose events to list.'),
    resourceName: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Optional Kubernetes resource name whose events to list.'),
    resourceUID: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Optional Kubernetes resource UID whose events to list.'),
    appNamespace: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('The Application CR namespace when using app-of-apps namespaces.'),
  })
);
export type ListApplicationEventsInput = z.infer<typeof ListApplicationEventsInputSchema>;

export const GetPodLogsInputSchema = lazySchema(() =>
  z.object({
    name: z.string().max(MAX_STRING_LENGTH).describe('The Argo CD application name.'),
    podName: z.string().max(MAX_STRING_LENGTH).describe('The Kubernetes pod name.'),
    namespace: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('The Kubernetes namespace of the pod (destination namespace).'),
    container: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('The container to read logs from. Required only for multi-container pods.'),
    tailLines: z
      .number()
      .optional()
      .default(200)
      .describe('Number of lines from the end of the logs to return (default: 200).'),
    sinceSeconds: z.number().optional().describe('Only return logs newer than this many seconds.'),
    appNamespace: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('The Application CR namespace when using app-of-apps namespaces.'),
  })
);
export type GetPodLogsInput = z.infer<typeof GetPodLogsInputSchema>;

export const SyncApplicationInputSchema = lazySchema(() =>
  z.object({
    name: z.string().max(MAX_STRING_LENGTH).describe('The Argo CD application name to sync.'),
    revision: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe(
        'Git revision (branch, tag, or commit SHA) to sync. Defaults to the app target revision.'
      ),
    prune: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'When true, delete cluster resources that are no longer defined in Git. Defaults to false. Prefer dryRun first.'
      ),
    dryRun: z
      .boolean()
      .optional()
      .describe('When true, simulate the sync without applying changes to the cluster.'),
    project: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('AppProject name. Pass this when using a project-scoped token.'),
    appNamespace: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('The Application CR namespace when using app-of-apps namespaces.'),
    syncOptions: z
      .array(z.string().max(MAX_STRING_LENGTH))
      .optional()
      .describe('Optional sync options, e.g. ["CreateNamespace=true", "PruneLast=true"].'),
    resources: z
      .array(
        z.object({
          group: z.string().max(MAX_STRING_LENGTH).optional(),
          kind: z.string().max(MAX_STRING_LENGTH),
          name: z.string().max(MAX_STRING_LENGTH),
          namespace: z.string().max(MAX_STRING_LENGTH).optional(),
        })
      )
      .optional()
      .describe('Optional list of specific resources to sync instead of the whole application.'),
    strategy: z
      .object({
        apply: z.object({ force: z.boolean().optional() }).optional(),
        hook: z.object({ force: z.boolean().optional() }).optional(),
      })
      .optional()
      .describe('Optional sync strategy (apply or hook).'),
  })
);
export type SyncApplicationInput = z.infer<typeof SyncApplicationInputSchema>;

export const ListClustersInputSchema = lazySchema(() =>
  z.object({
    id: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Optional cluster server URL or name filter.'),
    name: z.string().max(MAX_STRING_LENGTH).optional().describe('Optional cluster name filter.'),
  })
);
export type ListClustersInput = z.infer<typeof ListClustersInputSchema>;

export const GetProjectInputSchema = lazySchema(() =>
  z.object({
    name: z.string().max(MAX_STRING_LENGTH).describe('The AppProject name.'),
    detailed: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        'When true (default), call GET /api/v1/projects/{name}/detailed for richer agent context.'
      ),
  })
);
export type GetProjectInput = z.infer<typeof GetProjectInputSchema>;
