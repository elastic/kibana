/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  commonWorkflowExecutionFailedTriggerDefinition,
  WORKFLOW_EXECUTION_FAILED_TRIGGER_ID,
} from '../../common/triggers/workflow_execution_failed';
import type { PublicTriggerDefinition } from '../trigger_registry/types';

export const workflowExecutionFailedPublicTriggerDefinition: PublicTriggerDefinition = {
  ...commonWorkflowExecutionFailedTriggerDefinition,
  title: i18n.translate('workflowsExtensions.triggers.workflowExecutionFailed.title', {
    defaultMessage: 'Workflow failed',
  }),
  description: i18n.translate('workflowsExtensions.triggers.workflowExecutionFailed.description', {
    defaultMessage:
      'Emitted when any workflow in the same space fails. Use to handle errors, send notifications, perform cleanup, or retry failed operations.',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/error').then(({ icon }) => ({ default: icon }))
  ),
  documentation: {
    details: i18n.translate(
      'workflowsExtensions.triggers.workflowExecutionFailed.documentation.details',
      {
        defaultMessage: `Emitted when a workflow run fails. The event includes \`workflow\` (id, name, spaceId, isErrorHandler), \`execution\` (id, startedAt, failedAt), and \`error\` (message, stepId, stepName, stepExecutionId). Use KQL in \`on.condition\` to filter by workflow name, failed step, or exclude error-handler workflows to avoid infinite loops.`,
      }
    ),
    examples: [
      i18n.translate(
        'workflowsExtensions.triggers.workflowExecutionFailed.documentation.exampleBasic',
        {
          defaultMessage: `## Log all workflow failures
\`\`\`yaml
triggers:
  - type: {triggerId}
steps:
  - name: log_to_index
    type: elasticsearch.index
    with:
      index: workflow-errors
      body:
        workflow_id: "{eventWorkflowId}"
        error: "{eventErrorMessage}"
        timestamp: "{eventFailedAt}"
\`\`\``,
          values: {
            triggerId: WORKFLOW_EXECUTION_FAILED_TRIGGER_ID,
            eventWorkflowId: '{{event.workflow.id}}',
            eventErrorMessage: '{{event.error.message}}',
            eventFailedAt: '{{event.execution.failedAt}}',
          },
        }
      ),
      i18n.translate(
        'workflowsExtensions.triggers.workflowExecutionFailed.documentation.exampleFilterName',
        {
          defaultMessage: `## Filter by workflow name
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: event.workflow.name: critical*
\`\`\``,
          values: { triggerId: WORKFLOW_EXECUTION_FAILED_TRIGGER_ID },
        }
      ),
      i18n.translate(
        'workflowsExtensions.triggers.workflowExecutionFailed.documentation.exampleExcludeErrorHandlers',
        {
          defaultMessage: `## Exclude error-handler workflows (prevent loops)
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: not event.workflow.isErrorHandler:true
\`\`\``,
          values: { triggerId: WORKFLOW_EXECUTION_FAILED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: {
    condition: 'not event.workflow.isErrorHandler:true',
  },
};
