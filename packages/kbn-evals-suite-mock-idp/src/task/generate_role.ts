/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RoleGenerationInput, RoleGenerationOutput } from '../types';

export const generateRole = async ({
  input,
  kbnClient,
  log,
}: {
  input: RoleGenerationInput;
  kbnClient: KbnClient;
  log: ToolingLog;
}): Promise<RoleGenerationOutput> => {
  log.info(`Generating role for: "${input.description}"`);

  try {
    const result = await kbnClient.request<{ roleName: string; llmRole: RoleGenerationOutput }>({
      method: 'POST',
      path: '/mock_idp/ai_generate_role',
      body: {
        description: input.description,
      },
    });

    const { roleName, llmRole } = result.data;
    log.info(`Role generated: "${roleName}"`);
    return { roleName, ...llmRole };
  } catch (err) {
    log.error(`Failed to generate role: ${err}`);
    return {
      roleName: '',
      kibana: [],
      elasticsearch: [],
      accessToSystemIndices: 'none',
      error: String(err),
    };
  }
};
