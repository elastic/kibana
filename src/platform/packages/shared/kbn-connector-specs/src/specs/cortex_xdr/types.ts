/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z, lazySchema } from '@kbn/zod/v4';
import {
  MAX_ACTION_ENDPOINTS,
  MAX_DOWNLOAD_BYTES,
  MAX_RETRIEVAL_ENDPOINTS,
  MAX_RETRIEVAL_PATHS,
} from './constants';
import {
  EndpointIdSchema,
  IntegerCaseIdSchema,
  Sha256Schema,
  StringCaseIdSchema,
  actionEndpointIds,
  actionId,
  epochMs,
  filterEndpointIds,
  maxResults,
  searchFrom,
} from './input_fields';

// ---------------------------------------------------------------------------
// Endpoints and response actions
// ---------------------------------------------------------------------------

export const GetEndpointsInputSchema = lazySchema(() =>
  z.object({
    endpointIds: filterEndpointIds(),
    hostnames: z
      .array(z.string().trim().min(1).max(255))
      .max(100)
      .optional()
      .describe('Only endpoints with these hostnames (exact match), up to 100'),
    ipList: z
      .array(z.string().trim().min(1).max(64))
      .max(100)
      .optional()
      .describe('Only endpoints with these IP addresses, up to 100. Example: ["10.0.0.5"]'),
    platform: z
      .enum(['windows', 'linux', 'macos', 'android'])
      .optional()
      .describe('Only endpoints on this operating system platform'),
    isolate: z
      .enum(['isolated', 'unisolated'])
      .optional()
      .describe('Only endpoints in this network isolation state'),
    endpointStatus: z
      .array(z.enum(['connected', 'disconnected', 'lost', 'uninstalled']))
      .min(1)
      .max(4)
      .optional()
      .describe('Only endpoints with these connection statuses'),
    scanStatus: z
      .array(
        z.enum([
          'none',
          'pending',
          'in_progress',
          'canceled',
          'aborted',
          'pending_cancellation',
          'success',
          'error',
        ])
      )
      .min(1)
      .max(8)
      .optional()
      .describe('Only endpoints whose malware scan is in one of these states'),
    sortField: z
      .enum(['endpoint_id', 'first_seen', 'last_seen'])
      .optional()
      .describe('Sort field (Cortex XDR default: first_seen)'),
    sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Sort order (Cortex XDR default: DESC)'),
    searchFrom: searchFrom(),
    maxResults: maxResults(),
  })
);
export type GetEndpointsInput = z.infer<typeof GetEndpointsInputSchema>;

/** Isolate, unisolate, scan and cancel scan: endpoint ids plus an optional case id. */
export const EndpointActionInputSchema = lazySchema(() =>
  z.object({
    endpointIds: actionEndpointIds(MAX_ACTION_ENDPOINTS),
    caseId: StringCaseIdSchema,
  })
);
export type EndpointActionInput = z.infer<typeof EndpointActionInputSchema>;

export const GetActionStatusInputSchema = lazySchema(() =>
  z.object({
    actionId: actionId(
      'isolateEndpoint, unisolateEndpoint, scanEndpoint, cancelScan, quarantineFile, restoreFile, runScript or retrieveFile'
    ),
  })
);
export type GetActionStatusInput = z.infer<typeof GetActionStatusInputSchema>;

export const GetPolicyInputSchema = lazySchema(() => z.object({ endpointId: EndpointIdSchema }));
export type GetPolicyInput = z.infer<typeof GetPolicyInputSchema>;

export const EndpointTagInputSchema = lazySchema(() =>
  z.object({
    endpointIds: actionEndpointIds(MAX_ACTION_ENDPOINTS),
    tag: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .describe('Endpoint tag name, up to 128 characters. Example: "under-investigation"'),
  })
);
export type EndpointTagInput = z.infer<typeof EndpointTagInputSchema>;

export const GetDeviceControlViolationsInputSchema = lazySchema(() =>
  z.object({
    endpointIds: filterEndpointIds(),
    hostnames: z
      .array(z.string().trim().min(1).max(255))
      .max(100)
      .optional()
      .describe('Only violations on these hostnames, up to 100'),
    types: z
      .array(z.string().trim().min(1).max(32))
      .max(10)
      .optional()
      .describe('Only these violation types, for example ["cd-rom", "disk drive"]'),
    timestampFrom: epochMs('Only violations at or after this time'),
    timestampTo: epochMs('Only violations at or before this time'),
    searchFrom: searchFrom(),
    maxResults: maxResults(),
  })
);
export type GetDeviceControlViolationsInput = z.infer<typeof GetDeviceControlViolationsInputSchema>;

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export const QuarantineFileInputSchema = lazySchema(() =>
  z.object({
    endpointIds: actionEndpointIds(MAX_ACTION_ENDPOINTS),
    filePath: z
      .string()
      .min(1)
      .max(4096)
      .describe(
        'Full path of the file on the endpoint, not a symbolic link. Example: "C:\\\\Users\\\\Public\\\\evil.exe"'
      ),
    fileHash: Sha256Schema,
  })
);
export type QuarantineFileInput = z.infer<typeof QuarantineFileInputSchema>;

export const RestoreFileInputSchema = lazySchema(() =>
  z.object({
    fileHash: Sha256Schema,
    endpointId: EndpointIdSchema.optional().describe(
      'Endpoint to restore the file on. Omit to restore it on every endpoint that holds it in quarantine.'
    ),
    caseId: IntegerCaseIdSchema,
  })
);
export type RestoreFileInput = z.infer<typeof RestoreFileInputSchema>;

const QuarantineStatusFileSchema = lazySchema(() =>
  z.object({
    endpointId: EndpointIdSchema,
    fileHash: Sha256Schema,
    filePath: z.string().min(1).max(4096).optional().describe('Full path of the file'),
  })
);

export const GetQuarantineStatusInputSchema = lazySchema(() =>
  z
    .object({
      endpointId: EndpointIdSchema.optional().describe('Endpoint id (single-file form)'),
      fileHash: Sha256Schema.optional().describe('SHA256 of the file (single-file form)'),
      filePath: z
        .string()
        .min(1)
        .max(4096)
        .optional()
        .describe('Full path of the file (single-file form, optional)'),
      files: z
        .array(QuarantineStatusFileSchema)
        .min(1)
        .max(100)
        .optional()
        .describe('Several files at once (1-100), each with endpointId, fileHash and filePath'),
    })
    .refine(
      ({ endpointId, fileHash, filePath, files }) => {
        const single = endpointId !== undefined || fileHash !== undefined || filePath !== undefined;
        if (files !== undefined) return !single;
        return endpointId !== undefined && fileHash !== undefined;
      },
      { message: 'Give either endpointId and fileHash (and optionally filePath), or files[]' }
    )
);
export type GetQuarantineStatusInput = z.infer<typeof GetQuarantineStatusInputSchema>;

export const HashListInputSchema = lazySchema(() =>
  z.object({
    hashList: z
      .array(Sha256Schema)
      .min(1)
      .max(1000)
      .describe('SHA256 hashes to add (1-1000), each 64 hexadecimal characters'),
    comment: z
      .string()
      .max(1024)
      .optional()
      .describe('Comment stored with the entries, up to 1024 characters'),
    caseId: IntegerCaseIdSchema,
  })
);
export type HashListInput = z.infer<typeof HashListInputSchema>;

const retrievalPaths = (os: string) =>
  z
    .array(z.string().min(1).max(4096))
    .max(MAX_RETRIEVAL_PATHS)
    .optional()
    .describe(`Full file paths to retrieve from ${os} endpoints`);

export const RetrieveFileInputSchema = lazySchema(() =>
  z
    .object({
      endpointIds: actionEndpointIds(MAX_RETRIEVAL_ENDPOINTS),
      windowsPaths: retrievalPaths('Windows'),
      linuxPaths: retrievalPaths('Linux'),
      macosPaths: retrievalPaths('macOS'),
      caseId: StringCaseIdSchema,
    })
    .refine(
      ({ windowsPaths = [], linuxPaths = [], macosPaths = [] }) => {
        const total = windowsPaths.length + linuxPaths.length + macosPaths.length;
        return total >= 1 && total <= MAX_RETRIEVAL_PATHS;
      },
      {
        message: `Give at least one path in windowsPaths, linuxPaths or macosPaths, and at most ${MAX_RETRIEVAL_PATHS} paths in total`,
      }
    )
);
export type RetrieveFileInput = z.infer<typeof RetrieveFileInputSchema>;

export const GetRetrievedFileDetailsInputSchema = lazySchema(() =>
  z.object({
    actionId: actionId('retrieveFile'),
    download: z
      .boolean()
      .default(false)
      .describe(
        'Also download each archive and return it base64-encoded in files[].contentBase64. Defaults to false.'
      ),
    maxDownloadSizeBytes: z
      .number()
      .int()
      .min(1)
      .max(MAX_DOWNLOAD_BYTES)
      .default(MAX_DOWNLOAD_BYTES)
      .describe(
        `Largest archive returned inline, in bytes (1-${MAX_DOWNLOAD_BYTES}, default ${MAX_DOWNLOAD_BYTES}); larger archives return their route only`
      ),
  })
);
export type GetRetrievedFileDetailsInput = z.infer<typeof GetRetrievedFileDetailsInputSchema>;

// ---------------------------------------------------------------------------
// Scripts
// ---------------------------------------------------------------------------

export const GetScriptsInputSchema = lazySchema(() =>
  z.object({
    names: z
      .array(z.string().min(1).max(255))
      .min(1)
      .max(50)
      .optional()
      .describe('Only scripts with these exact names, up to 50'),
    windowsSupported: z
      .boolean()
      .optional()
      .describe('Only scripts that support Windows (true) or not (false)'),
    linuxSupported: z
      .boolean()
      .optional()
      .describe('Only scripts that support Linux (true) or not (false)'),
    macosSupported: z
      .boolean()
      .optional()
      .describe('Only scripts that support macOS (true) or not (false)'),
    isHighRisk: z
      .boolean()
      .optional()
      .describe('Only high-risk (true) or not high-risk (false) scripts'),
  })
);
export type GetScriptsInput = z.infer<typeof GetScriptsInputSchema>;

export const RunScriptInputSchema = lazySchema(() =>
  z.object({
    scriptUid: z
      .string()
      .max(64)
      .regex(/^[A-Za-z0-9_-]{1,64}$/, 'Enter the script_uid from getScripts')
      .describe('script_uid of a library script, from getScripts'),
    endpointIds: actionEndpointIds(MAX_ACTION_ENDPOINTS),
    parameters: z
      .record(z.string().min(1).max(128), z.union([z.string().max(4096), z.number()]))
      .refine((value) => Object.keys(value).length <= 50, {
        message: 'At most 50 parameters',
      })
      .optional()
      .describe(
        'Script parameter values by name, as the script defines them (strings or numbers, up to 50). Example: {"path": "C:\\\\Temp"}'
      ),
    timeout: z
      .number()
      .int()
      .min(1)
      .max(3600)
      .default(600)
      .describe('Seconds the script may run on each endpoint (1-3600, default 600)'),
    caseId: StringCaseIdSchema,
  })
);
export type RunScriptInput = z.infer<typeof RunScriptInputSchema>;

export const GetScriptResultsInputSchema = lazySchema(() =>
  z.object({ actionId: actionId('runScript') })
);
export type GetScriptResultsInput = z.infer<typeof GetScriptResultsInputSchema>;

export * from './types_cases';
