/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { getBuiltInStepStability } from '@kbn/workflows';
import { BaseMonacoConnectorHandler } from './base_monaco_connector_handler';
import type { ConnectorExamples, HoverContext } from '../monaco_providers/provider_interfaces';

const WORKFLOW_EXECUTE_TYPES = ['workflow.execute', 'workflow.executeAsync'] as const;

export class WorkflowExecuteMonacoConnectorHandler extends BaseMonacoConnectorHandler {
  constructor() {
    super('WorkflowExecuteMonacoConnectorHandler', 80, ['workflow.execute']);
  }

  canHandle(connectorType: string): boolean {
    return (WORKFLOW_EXECUTE_TYPES as readonly string[]).includes(connectorType);
  }

  async generateHoverContent(context: HoverContext): Promise<monaco.IMarkdownString | null> {
    const { connectorType, stepContext } = context;
    if (!stepContext) {
      return null;
    }

    const isAsync = connectorType === 'workflow.executeAsync';
    const stability = getBuiltInStepStability(connectorType);

    const content = [
      `**Step**: \`${connectorType}\``,
      '',
      isAsync
        ? 'Execute another workflow **asynchronously** — the current workflow continues without waiting for the child workflow to complete.'
        : 'Execute another workflow **synchronously** — the current workflow waits for the child workflow to complete before continuing.',
      this.getStabilityNote(stability),
      '',
      '**Parameters:**',
      '- `workflow-id` _(required)_ — The ID of the workflow to execute',
      '- `inputs` _(optional)_ — Key-value inputs to pass to the child workflow',
      '',
      '**Example:**',
      '',
      '```yaml',
      `- name: run_child`,
      `  type: ${connectorType}`,
      `  with:`,
      `    workflow-id: my-other-workflow`,
      `    inputs:`,
      `      key: value`,
      '```',
    ].join('\n');

    return this.createMarkdownContent(content);
  }

  getExamples(connectorType: string): ConnectorExamples | null {
    return {
      params: {
        'workflow-id': 'my-other-workflow',
        inputs: { key: 'value' },
      },
      snippet: `- name: run_child\n  type: ${connectorType}\n  with:\n    workflow-id: my-other-workflow\n    inputs:\n      key: value`,
    };
  }
}
