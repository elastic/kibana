/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { buildExternalResumeUrl } from '../../common/external_resume/build_external_resume_url';
import {
  DEFAULT_EXTERNAL_RESUME_TTL,
  MAX_EXTERNAL_RESUME_TTL_MS,
  WORKFLOW_EXTERNAL_RESUME_APPLICATION,
  WORKFLOW_EXTERNAL_RESUME_ROLE,
} from '../../common/external_resume/constants';
import { parseDuration } from '../../common/lib/parse_duration';
import {
  publicApiAccessStepCommonDefinition,
  type PublicApiAccessStepInput,
} from '../../common/steps/public_api_access_step';

function getValidatedTtl(ttl: string | undefined): string {
  const resolvedTtl = ttl ?? DEFAULT_EXTERNAL_RESUME_TTL;
  const ttlMs = parseDuration(resolvedTtl);

  if (ttlMs > MAX_EXTERNAL_RESUME_TTL_MS) {
    throw new Error('workflows.publicApiAccess ttl cannot exceed 24h');
  }

  return resolvedTtl;
}

export const publicApiAccessStepDefinition = createServerStepDefinition({
  ...publicApiAccessStepCommonDefinition,
  handler: async (context) => {
    try {
      const { ttl }: PublicApiAccessStepInput = context.input;
      const validatedTtl = getValidatedTtl(ttl);
      const workflowContext = context.contextManager.getContext();
      const executionId = workflowContext.execution.id;
      const spaceId = workflowContext.workflow.spaceId;
      const kibanaUrl = workflowContext.kibanaUrl;

      const esClient = context.contextManager.getScopedEsClient();
      const apiKey = await esClient.security.createApiKey({
        name: `workflow-public-resume-${executionId}-${context.stepId}`,
        expiration: validatedTtl,
        role_descriptors: {
          [WORKFLOW_EXTERNAL_RESUME_ROLE]: {
            cluster: [],
            indices: [],
            applications: [],
            run_as: [],
          },
        },
        metadata: {
          application: WORKFLOW_EXTERNAL_RESUME_APPLICATION,
          workflow_execution_id: executionId,
          workflow_id: workflowContext.workflow.id,
          workflow_space_id: spaceId,
        },
      });

      const resumeUrl = buildExternalResumeUrl({
        kibanaUrl,
        spaceId,
        executionId,
        encodedApiKey: apiKey.encoded,
      });

      context.logger.debug(
        `Created public API access credentials for external resume (execution=${executionId}, apiKeyId=${apiKey.id})`
      );

      return {
        output: {
          apiKeyId: apiKey.id,
          resumeUrl,
          ttl: validatedTtl,
          ...(apiKey.expiration !== undefined && {
            expiresAt: new Date(apiKey.expiration).toISOString(),
          }),
        },
      };
    } catch (error) {
      context.logger.error('workflows.publicApiAccess step failed', error);
      return {
        error: error instanceof Error ? error : new Error('Failed to create public API access'),
      };
    }
  },
});
