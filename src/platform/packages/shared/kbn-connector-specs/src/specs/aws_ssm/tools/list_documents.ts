/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionDefinition } from '../../../connector_spec';
import { callSsmApi } from '../aws_ssm_api';
import type { SsmFilter } from './shared';
import { nextTokenSchema, toNextToken } from './shared';

const MAX_RESULTS_MAX = 50;
const NAME_PREFIX_MAX_LENGTH = 256;

// Only the document types sendCommand and startAutomationExecution can run.
const DOCUMENT_TYPES = ['Command', 'Automation'] as const;
const OWNERS = ['Self', 'Amazon', 'Private', 'Public', 'ThirdParty'] as const;
// AWS documents only Linux and Windows as PlatformTypes filter values.
const PLATFORM_TYPES = ['Linux', 'Windows'] as const;

const ListDocumentsInputSchema = lazySchema(() =>
  z.object({
    documentType: z
      .enum(DOCUMENT_TYPES)
      .optional()
      .describe(
        'Only return documents of this type: "Command" for documents sendCommand runs, "Automation" for runbooks startAutomationExecution runs.'
      ),
    owner: z
      .enum(OWNERS)
      .optional()
      .describe(
        'Only return documents with this owner: "Self" for documents created in this account, "Amazon" for AWS-owned documents (names starting with "AWS-"), "Private" for documents shared with this account, "Public" for public documents, "ThirdParty" for third-party documents.'
      ),
    namePrefix: z
      .string()
      .min(1)
      .max(NAME_PREFIX_MAX_LENGTH)
      .optional()
      .describe('Only return documents whose name starts with this, e.g. "AWS-Restart".'),
    platformType: z
      .enum(PLATFORM_TYPES)
      .optional()
      .describe('Only return documents that run on this operating system family.'),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_MAX)
      .optional()
      .describe(`Maximum number of documents to return (1-${MAX_RESULTS_MAX}).`),
    nextToken: nextTokenSchema(),
  })
);
type ListDocumentsInput = z.infer<typeof ListDocumentsInputSchema>;

const ListDocumentsResponseSchema = lazySchema(() =>
  z.object({
    DocumentIdentifiers: z
      .array(
        z.object({
          Name: z.string().optional(),
          DisplayName: z.string().optional(),
          DocumentType: z.string().optional(),
          Owner: z.string().optional(),
          PlatformTypes: z.array(z.string()).optional(),
          DocumentVersion: z.string().optional(),
          TargetType: z.string().optional(),
        })
      )
      .optional(),
    NextToken: z.string().optional(),
  })
);

const toDocumentFilters = ({
  documentType,
  owner,
  namePrefix,
  platformType,
}: ListDocumentsInput): SsmFilter[] => [
  ...(documentType ? [{ Key: 'DocumentType', Values: [documentType] }] : []),
  ...(owner ? [{ Key: 'Owner', Values: [owner] }] : []),
  ...(namePrefix ? [{ Key: 'Name', Values: [namePrefix] }] : []),
  ...(platformType ? [{ Key: 'PlatformTypes', Values: [platformType] }] : []),
];

export const listDocuments: ActionDefinition<ListDocumentsInput> = {
  isTool: true,
  scope: 'read',
  description:
    'List the SSM documents this account can run: Command documents for sendCommand and Automation runbooks for startAutomationExecution, with their name, display name, type, owner, platforms, default version and target resource type. Without filters this returns hundreds of AWS-owned documents, so filter by documentType, owner ("Self" for the account\'s own), namePrefix (e.g. "AWS-Restart") or platformType. Pass nextToken from the response as nextToken to fetch the next page. Use getDocument to read what a document does and which parameters it takes.',
  input: ListDocumentsInputSchema,
  handler: async (ctx, input) => {
    const { maxResults, nextToken } = input;
    const filters = toDocumentFilters(input);
    const data = await callSsmApi({
      ctx,
      operation: 'ListDocuments',
      body: {
        Filters: filters.length > 0 ? filters : undefined,
        MaxResults: maxResults,
        NextToken: nextToken || undefined,
      },
    });
    const { DocumentIdentifiers = [], NextToken } = ListDocumentsResponseSchema.parse(data);
    return {
      documents: DocumentIdentifiers.map(
        ({
          Name,
          DisplayName,
          DocumentType,
          Owner,
          PlatformTypes,
          DocumentVersion,
          TargetType,
        }) => ({
          name: Name,
          displayName: DisplayName,
          documentType: DocumentType,
          owner: Owner,
          platformTypes: PlatformTypes,
          documentVersion: DocumentVersion,
          targetType: TargetType,
        })
      ),
      nextToken: toNextToken(NextToken),
    };
  },
};
