/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { OBJECT_TYPES, OBJECT_VALUE_MAX } from './constants';
import { idField, UUID_PATTERN } from './types';

/** Identifier and filter values are trimmed; a blank one is refused with this message. */
const notBlank = (name: string) => `${name} must not be blank`;

const agentGuid = () =>
  z
    .string()
    .trim()
    .max(36)
    .regex(UUID_PATTERN, 'agentGuid is a UUID')
    .optional()
    .describe('Agent GUID from listEndpoints. Give agentGuid or endpointName.');
const endpointName = () =>
  z.string().trim().min(1, notBlank('endpointName')).max(255).optional().describe('Computer name.');
const taskDescription = () =>
  z.string().max(20480).optional().describe('Note shown in the product task list.');

const ONE_ENDPOINT = {
  message: 'Give exactly one of agentGuid or endpointName',
};
const hasOneEndpoint = (input: { agentGuid?: string; endpointName?: string }): boolean =>
  (input.agentGuid === undefined) !== (input.endpointName === undefined);

export const EndpointTaskInputSchema = lazySchema(() =>
  z
    .object({
      agentGuid: agentGuid(),
      endpointName: endpointName(),
      description: taskDescription(),
    })
    .refine(hasOneEndpoint, ONE_ENDPOINT)
);
export type EndpointTaskInput = z.infer<typeof EndpointTaskInputSchema>;

export const TerminateProcessInputSchema = lazySchema(() =>
  z
    .object({
      agentGuid: agentGuid(),
      endpointName: endpointName(),
      processId: z.number().int().min(0).describe('Process id (PID).'),
      fileName: z
        .string()
        .trim()
        .min(1, notBlank('fileName'))
        .max(255)
        .optional()
        .describe('Full path of the executable. Give fileName, fileSha1 or both.'),
      fileSha1: z
        .string()
        .length(40)
        .regex(/^[0-9a-fA-F]{40}$/, 'fileSha1 is 40 hex characters')
        .optional()
        .describe('SHA-1 of the executable.'),
      description: taskDescription(),
    })
    .refine(hasOneEndpoint, ONE_ENDPOINT)
    .refine((input) => input.fileName !== undefined || input.fileSha1 !== undefined, {
      message: 'Give fileName, fileSha1 or both',
    })
);
export type TerminateProcessInput = z.infer<typeof TerminateProcessInputSchema>;

export const CollectFileInputSchema = lazySchema(() =>
  z
    .object({
      agentGuid: agentGuid(),
      endpointName: endpointName(),
      filePath: z
        .string()
        .trim()
        .min(1, notBlank('filePath'))
        .max(1024)
        .describe('Full path of the file on the endpoint.'),
      description: taskDescription(),
    })
    .refine(hasOneEndpoint, ONE_ENDPOINT)
);
export type CollectFileInput = z.infer<typeof CollectFileInputSchema>;

export const GetTaskInputSchema = lazySchema(() =>
  z.object({ id: idField('id').describe('taskId returned by a response action.') })
);
export type GetTaskInput = z.infer<typeof GetTaskInputSchema>;

export const EmailTaskInputSchema = lazySchema(() =>
  z
    .object({
      messageId: z
        .string()
        .trim()
        .min(1, notBlank('messageId'))
        .max(255)
        .optional()
        .describe('Internet message id.'),
      mailBox: z
        .string()
        .max(255)
        .optional()
        .describe('Mailbox address; only with messageId. Default: all mailboxes.'),
      uniqueId: z
        .string()
        .trim()
        .min(1, notBlank('uniqueId'))
        .max(255)
        .optional()
        .describe('Product unique id of the message.'),
      description: taskDescription(),
    })
    .refine((input) => (input.messageId === undefined) !== (input.uniqueId === undefined), {
      message: 'Give exactly one of messageId or uniqueId',
    })
    .refine((input) => input.mailBox === undefined || input.messageId !== undefined, {
      message: 'mailBox is used only with messageId',
    })
);
export type EmailTaskInput = z.infer<typeof EmailTaskInputSchema>;

export const AccountTaskInputSchema = lazySchema(() =>
  z.object({
    accountName: z
      .string()
      .trim()
      .min(1, notBlank('accountName'))
      .max(255)
      .describe('User account name in the identity provider.'),
    description: taskDescription(),
  })
);
export type AccountTaskInput = z.infer<typeof AccountTaskInputSchema>;

const objectValueFits = (input: { type: keyof typeof OBJECT_VALUE_MAX; value: string }) => {
  if (input.type === 'fileSha1') return /^[0-9a-fA-F]{40}$/.test(input.value);
  if (input.type === 'fileSha256') return /^[0-9a-fA-F]{64}$/.test(input.value);
  return input.value.length <= OBJECT_VALUE_MAX[input.type];
};
const VALUE_RULE = {
  message:
    'value does not fit its type: url 2048, domain 253, ip 39, senderMailAddress 320 characters; fileSha1 40 and fileSha256 64 hex characters',
  path: ['value'],
};
const objectType = () => z.enum(OBJECT_TYPES).describe('Kind of object.');
const objectValue = () =>
  z
    .string()
    .trim()
    .min(1, notBlank('value'))
    .max(2048)
    .describe('The URL, domain, IP, hash or address.');
const objectDescription = () => z.string().max(1000).optional().describe('Note on the entry.');

export const AddSuspiciousObjectInputSchema = lazySchema(() =>
  z
    .object({
      type: objectType(),
      value: objectValue(),
      scanAction: z.enum(['block', 'log']).optional().describe('Action on a match.'),
      riskLevel: z.enum(['high', 'medium', 'low']).optional().describe('Risk level.'),
      daysToExpiration: z
        .number()
        .int()
        .min(-1)
        .max(365)
        .optional()
        .describe('Days until it expires; -1 never (product default 30).'),
      description: objectDescription(),
    })
    .refine(objectValueFits, VALUE_RULE)
);
export type AddSuspiciousObjectInput = z.infer<typeof AddSuspiciousObjectInputSchema>;

export const RemoveSuspiciousObjectInputSchema = lazySchema(() =>
  z.object({ type: objectType(), value: objectValue() }).refine(objectValueFits, VALUE_RULE)
);
export type RemoveSuspiciousObjectInput = z.infer<typeof RemoveSuspiciousObjectInputSchema>;

export const AddExceptionInputSchema = lazySchema(() =>
  z
    .object({ type: objectType(), value: objectValue(), description: objectDescription() })
    .refine(objectValueFits, VALUE_RULE)
);
export type AddExceptionInput = z.infer<typeof AddExceptionInputSchema>;

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
const byteLimit = (max: number) => (value: string) => Buffer.byteLength(value, 'utf8') <= max;

export const SubmitFileInputSchema = lazySchema(() =>
  z.object({
    file: z
      .string()
      .min(4)
      .max(1048576)
      .regex(BASE64, 'file is base64 content')
      .describe('Base64 file content (about 768 KB of file at most).'),
    fileName: z.string().min(1).max(255).describe('File name with extension.'),
    documentPassword: z
      .string()
      .max(128)
      .refine(byteLimit(128), 'documentPassword is at most 128 bytes')
      .optional()
      .describe('Plain-text password of the document.'),
    archivePassword: z
      .string()
      .max(128)
      .refine(byteLimit(128), 'archivePassword is at most 128 bytes')
      .optional()
      .describe('Plain-text password of the archive.'),
    arguments: z
      .string()
      .max(1024)
      .refine(byteLimit(1024), 'arguments is at most 1024 bytes')
      .optional()
      .describe('Command-line arguments for PE and script files.'),
  })
);
export type SubmitFileInput = z.infer<typeof SubmitFileInputSchema>;

export const SubmitUrlsInputSchema = lazySchema(() =>
  z.object({
    urls: z.array(z.string().min(1).max(2048)).min(1).max(10).describe('1 to 10 URLs.'),
  })
);
export type SubmitUrlsInput = z.infer<typeof SubmitUrlsInputSchema>;

export const GetSandboxResultInputSchema = lazySchema(() =>
  z.object({ id: idField('id').describe('Submission id from a sandbox submit action.') })
);
export type GetSandboxResultInput = z.infer<typeof GetSandboxResultInputSchema>;
