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
import { documentNameOrArnSchema, documentVersionSchema } from './shared';

const GetDocumentInputSchema = lazySchema(() =>
  z.object({
    name: documentNameOrArnSchema().describe(
      'The name or ARN of the document, e.g. "AWS-RunShellScript" or "AWS-RestartEC2Instance".'
    ),
    documentVersion: documentVersionSchema()
      .optional()
      .describe('The document version to read: "$DEFAULT" (the default), "$LATEST", or a number.'),
  })
);
type GetDocumentInput = z.infer<typeof GetDocumentInputSchema>;

const GetDocumentResponseSchema = lazySchema(() =>
  z.object({
    Name: z.string().optional(),
    DisplayName: z.string().optional(),
    DocumentType: z.string().optional(),
    DocumentVersion: z.string().optional(),
    Status: z.string().optional(),
    Content: z.string().optional(),
  })
);

export const getDocument: ActionDefinition<GetDocumentInput> = {
  isTool: true,
  scope: 'read',
  description:
    'Read an SSM document as YAML: its description, the parameters it takes (with their type, description and default) and the steps it runs. Use it before sendCommand or startAutomationExecution to find the parameters a document needs, and to tell the user what it will do.',
  input: GetDocumentInputSchema,
  handler: async (ctx, { name, documentVersion }) => {
    const data = await callSsmApi({
      ctx,
      operation: 'GetDocument',
      // SSM converts JSON documents too; YAML is the more compact read for an agent.
      body: { Name: name, DocumentVersion: documentVersion, DocumentFormat: 'YAML' },
    });
    const { Name, DisplayName, DocumentType, DocumentVersion, Status, Content } =
      GetDocumentResponseSchema.parse(data);
    return {
      name: Name,
      displayName: DisplayName,
      documentType: DocumentType,
      documentVersion: DocumentVersion,
      status: Status,
      content: Content,
    };
  },
};
