/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { WorkflowExecutionNotAdmittedError } from '@kbn/workflows/common/errors';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

/**
 * Throws {@link WorkflowExecutionNotAdmittedError} when a registered admission guard refuses
 * the run. Ephemeral workflows have no saved id to attribute the run to, so they are not checked.
 */
export const ensureExecutionAdmitted = async ({
  workflow,
  spaceId,
  triggeredBy,
  workflowsExtensions,
}: {
  workflow: Pick<WorkflowExecutionEngineModel, 'id' | 'isEphemeral'>;
  spaceId: string;
  triggeredBy: string;
  workflowsExtensions: Pick<WorkflowsExtensionsServerPluginStart, 'checkExecutionAdmission'>;
}): Promise<void> => {
  if (workflow.isEphemeral) {
    return;
  }
  const decision = await workflowsExtensions.checkExecutionAdmission({
    workflowId: workflow.id,
    spaceId,
    triggeredBy,
  });
  if (!decision.admitted) {
    throw new WorkflowExecutionNotAdmittedError(workflow.id, decision.guardId, decision.reason);
  }
};
