/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { WorkflowContext } from '@kbn/workflows';
import { WORKFLOW_RUN_NAME_MAX_LENGTH } from '@kbn/workflows';
import { WorkflowTemplatingEngine } from '../templating_engine';
import {
  buildWorkflowRenderContext,
  type WorkflowExecutionForInputRendering,
} from '../workflow_context_manager/build_workflow_context';
import type { ContextDependencies } from '../workflow_context_manager/types';

export const getWorkflowExecutionName = (
  execution: WorkflowExecutionForInputRendering,
  logger: Logger,
  coreStart?: CoreStart,
  dependencies?: ContextDependencies
): string | undefined => {
  const template = execution.workflowDefinition?.['run-name'];
  if (!template) {
    return undefined;
  }

  try {
    const engine = new WorkflowTemplatingEngine({
      liquidSettings: execution.workflowDefinition?.settings?.liquid,
    });
    const context = buildWorkflowRenderContext(execution, coreStart, dependencies);
    const overrides: Partial<WorkflowContext> | undefined = execution.context?.contextOverride;
    const result = engine.render(
      template,
      overrides
        ? {
            ...context,
            consts: { ...context.consts, ...overrides.consts },
            inputs: { ...context.inputs, ...overrides.inputs },
            event: { ...context.event, ...overrides.event },
            execution: { ...context.execution, ...overrides.execution },
            workflow: { ...context.workflow, ...overrides.workflow },
          }
        : context
    );
    return typeof result === 'string'
      ? result
          .trim()
          .slice(0, WORKFLOW_RUN_NAME_MAX_LENGTH)
          .replace(/[\uD800-\uDBFF]$/, '') || undefined
      : undefined;
  } catch {
    logger.warn('Could not evaluate run-name; using the default execution label.');
    return undefined;
  }
};
