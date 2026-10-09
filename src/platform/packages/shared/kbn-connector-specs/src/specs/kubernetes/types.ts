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

// =============================================================================
// Shared field descriptions
// =============================================================================

const API_VERSION_DESCRIPTION =
  'The API group and version of the resource, exactly as it appears in a manifest\'s "apiVersion" field. ' +
  'Use "v1" for core resources (pods, services, configmaps, secrets, nodes, namespaces) and "<group>/<version>" ' +
  'for grouped resources (e.g. "apps/v1" for deployments/statefulsets/daemonsets, "batch/v1" for jobs/cronjobs, ' +
  '"networking.k8s.io/v1" for ingresses, "rbac.authorization.k8s.io/v1" for roles).';

const RESOURCE_DESCRIPTION =
  'The lowercase plural resource name as it appears in the Kubernetes REST API path — NOT the Kind. ' +
  'For example: "pods" (not "Pod"), "deployments" (not "Deployment"), "services", "configmaps", "secrets", ' +
  '"namespaces", "nodes", "jobs", "cronjobs", "ingresses", "persistentvolumeclaims". ' +
  'The field name is "resource", not "resourceType" or "kind".';

const NAMESPACE_DESCRIPTION =
  'The namespace to operate in. Omit for cluster-scoped resources (e.g. namespaces, nodes, ' +
  'persistentvolumes) or, on list actions, to list across all namespaces.';

const DRY_RUN_DESCRIPTION =
  'When true, the API server validates and processes the request but persists nothing (sends ?dryRun=All). ' +
  'Use this to preview the effect of a mutating call before applying it for real.';

// =============================================================================
// Generic request
// =============================================================================

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
        'The Kubernetes API path, starting with a slash. ' +
          'Examples: "/api/v1/namespaces/default/pods", "/apis/apps/v1/namespaces/default/deployments/my-app", ' +
          '"/api/v1/nodes", "/version". Do not include the host — it comes from the connector configuration.'
      ),
    query: z
      .record(z.string().max(MAX_STRING_LENGTH), z.string().max(MAX_STRING_LENGTH))
      .optional()
      .describe(
        'Optional query parameters, e.g. { labelSelector: "app=nginx" } or { fieldSelector: "status.phase=Running" }.'
      ),
    body: z
      .unknown()
      .optional()
      .describe(
        'Optional request body for POST/PUT/PATCH. A JSON object for most requests, or a JSON array for ' +
          'JSON Patch (application/json-patch+json) operations.'
      ),
    contentType: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe(
        'Optional Content-Type override. Kubernetes PATCH requires one of: ' +
          '"application/strategic-merge-patch+json" (default for PATCH), "application/merge-patch+json", ' +
          '"application/json-patch+json", or "application/apply-patch+json" for server-side apply.'
      ),
  })
);
export type RequestInput = z.infer<typeof RequestInputSchema>;

// =============================================================================
// Typed reads
// =============================================================================

export const ListResourcesInputSchema = lazySchema(() =>
  z.object({
    apiVersion: z.string().max(MAX_STRING_LENGTH).describe(API_VERSION_DESCRIPTION),
    resource: z.string().max(MAX_STRING_LENGTH).describe(RESOURCE_DESCRIPTION),
    namespace: z.string().max(MAX_STRING_LENGTH).optional().describe(NAMESPACE_DESCRIPTION),
    labelSelector: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Optional label selector to filter results, e.g. "app=nginx,tier=frontend".'),
    fieldSelector: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Optional field selector to filter results, e.g. "status.phase=Running".'),
    limit: z
      .number()
      .optional()
      .default(100)
      .describe('Maximum number of items to return (default: 100).'),
    continue: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe(
        'Continue token from a previous list response for pagination. Pass the `continue` value ' +
          'from the prior response to fetch the next page.'
      ),
  })
);
export type ListResourcesInput = z.infer<typeof ListResourcesInputSchema>;

export const GetResourceInputSchema = lazySchema(() =>
  z.object({
    apiVersion: z.string().max(MAX_STRING_LENGTH).describe(API_VERSION_DESCRIPTION),
    resource: z.string().max(MAX_STRING_LENGTH).describe(RESOURCE_DESCRIPTION),
    name: z.string().max(MAX_STRING_LENGTH).describe('The name of the resource to retrieve.'),
    namespace: z.string().max(MAX_STRING_LENGTH).optional().describe(NAMESPACE_DESCRIPTION),
  })
);
export type GetResourceInput = z.infer<typeof GetResourceInputSchema>;

export const ListNamespacesInputSchema = lazySchema(() =>
  z.object({
    labelSelector: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Optional label selector to filter namespaces, e.g. "team=platform".'),
  })
);
export type ListNamespacesInput = z.infer<typeof ListNamespacesInputSchema>;

export const GetPodLogsInputSchema = lazySchema(() =>
  z.object({
    namespace: z.string().max(MAX_STRING_LENGTH).describe('The namespace the pod belongs to.'),
    name: z.string().max(MAX_STRING_LENGTH).describe('The name of the pod.'),
    container: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('The container to read logs from. Required only for multi-container pods.'),
    previous: z
      .boolean()
      .optional()
      .describe('When true, returns logs from the previous terminated container instance.'),
    tailLines: z
      .number()
      .optional()
      .default(200)
      .describe('Number of lines from the end of the logs to return (default: 200).'),
    sinceSeconds: z
      .number()
      .optional()
      .describe('If set, only returns logs newer than this many seconds.'),
  })
);
export type GetPodLogsInput = z.infer<typeof GetPodLogsInputSchema>;

export const ListEventsInputSchema = lazySchema(() =>
  z.object({
    namespace: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('The namespace to read events from. Omit to read events across all namespaces.'),
    labelSelector: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('Optional label selector to filter events, e.g. "app=nginx".'),
    fieldSelector: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe(
        'Optional field selector to filter events, e.g. "involvedObject.name=my-pod" or "type=Warning".'
      ),
    limit: z
      .number()
      .optional()
      .default(100)
      .describe('Maximum number of events to return (default: 100).'),
    continue: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe(
        'Continue token from a previous list response for pagination. Pass the `continue` value ' +
          'from the prior response to fetch the next page.'
      ),
  })
);
export type ListEventsInput = z.infer<typeof ListEventsInputSchema>;

// =============================================================================
// Typed writes
// =============================================================================

export const CreateResourceInputSchema = lazySchema(() =>
  z.object({
    apiVersion: z.string().max(MAX_STRING_LENGTH).describe(API_VERSION_DESCRIPTION),
    resource: z.string().max(MAX_STRING_LENGTH).describe(RESOURCE_DESCRIPTION),
    namespace: z.string().max(MAX_STRING_LENGTH).optional().describe(NAMESPACE_DESCRIPTION),
    manifest: z
      .record(z.string().max(MAX_STRING_LENGTH), z.unknown())
      .describe(
        'The full resource manifest as a JSON object (including apiVersion, kind, metadata, and spec).'
      ),
    dryRun: z.boolean().optional().describe(DRY_RUN_DESCRIPTION),
  })
);
export type CreateResourceInput = z.infer<typeof CreateResourceInputSchema>;

export const ApplyResourceInputSchema = lazySchema(() =>
  z.object({
    apiVersion: z.string().max(MAX_STRING_LENGTH).describe(API_VERSION_DESCRIPTION),
    resource: z.string().max(MAX_STRING_LENGTH).describe(RESOURCE_DESCRIPTION),
    name: z
      .string()
      .max(MAX_STRING_LENGTH)
      .describe('The name of the resource to apply (must match manifest.metadata.name).'),
    namespace: z.string().max(MAX_STRING_LENGTH).optional().describe(NAMESPACE_DESCRIPTION),
    manifest: z
      .record(z.string().max(MAX_STRING_LENGTH), z.unknown())
      .describe(
        'The desired resource manifest as a JSON object, used as the server-side apply patch.'
      ),
    fieldManager: z
      .string()
      .max(MAX_STRING_LENGTH)
      .optional()
      .default('kibana')
      .describe('The field manager name recorded by server-side apply (default: "kibana").'),
    force: z
      .boolean()
      .optional()
      .describe(
        'When true, forcibly takes ownership of conflicting fields during server-side apply.'
      ),
    dryRun: z.boolean().optional().describe(DRY_RUN_DESCRIPTION),
  })
);
export type ApplyResourceInput = z.infer<typeof ApplyResourceInputSchema>;

export const PatchResourceInputSchema = lazySchema(() =>
  z.object({
    apiVersion: z.string().max(MAX_STRING_LENGTH).describe(API_VERSION_DESCRIPTION),
    resource: z.string().max(MAX_STRING_LENGTH).describe(RESOURCE_DESCRIPTION),
    name: z.string().max(MAX_STRING_LENGTH).describe('The name of the resource to patch.'),
    namespace: z.string().max(MAX_STRING_LENGTH).optional().describe(NAMESPACE_DESCRIPTION),
    patch: z
      .union([z.record(z.string().max(MAX_STRING_LENGTH), z.unknown()), z.array(z.unknown())])
      .describe(
        'The patch body. A JSON object for strategic-merge/merge patches, or a JSON array of operations ' +
          'for JSON Patch (patchType "json").'
      ),
    patchType: z
      .enum(['strategic', 'merge', 'json'])
      .optional()
      .default('strategic')
      .describe(
        'The patch strategy: "strategic" (default, strategic-merge-patch+json), "merge" (merge-patch+json), ' +
          'or "json" (json-patch+json, requires an array patch body).'
      ),
    dryRun: z.boolean().optional().describe(DRY_RUN_DESCRIPTION),
  })
);
export type PatchResourceInput = z.infer<typeof PatchResourceInputSchema>;

export const DeleteResourceInputSchema = lazySchema(() =>
  z.object({
    apiVersion: z.string().max(MAX_STRING_LENGTH).describe(API_VERSION_DESCRIPTION),
    resource: z.string().max(MAX_STRING_LENGTH).describe(RESOURCE_DESCRIPTION),
    name: z.string().max(MAX_STRING_LENGTH).describe('The name of the resource to delete.'),
    namespace: z.string().max(MAX_STRING_LENGTH).optional().describe(NAMESPACE_DESCRIPTION),
    dryRun: z.boolean().optional().describe(DRY_RUN_DESCRIPTION),
  })
);
export type DeleteResourceInput = z.infer<typeof DeleteResourceInputSchema>;

export const ScaleWorkloadInputSchema = lazySchema(() =>
  z.object({
    resource: z
      .enum(['deployments', 'statefulsets', 'replicasets'])
      .describe('The scalable workload resource type.'),
    name: z.string().max(MAX_STRING_LENGTH).describe('The name of the workload to scale.'),
    namespace: z.string().max(MAX_STRING_LENGTH).describe('The namespace the workload belongs to.'),
    replicas: z.number().int().min(0).describe('The desired number of replicas.'),
    dryRun: z.boolean().optional().describe(DRY_RUN_DESCRIPTION),
  })
);
export type ScaleWorkloadInput = z.infer<typeof ScaleWorkloadInputSchema>;
