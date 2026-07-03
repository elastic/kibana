/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { getBuiltInStepDefinition, getBuiltInStepStability } from '@kbn/workflows';
import { BaseMonacoConnectorHandler } from './base_monaco_connector_handler';
import type { ConnectorExamples, HoverContext } from '../monaco_providers/provider_interfaces';

/**
 * Hover handler for every built-in workflow step (wait, waitForInput, workflow.execute,
 * workflow.executeAsync, workflow.fail, workflow.output, parallel, merge, if, foreach, …).
 *
 * Content comes straight from the step definition in `@kbn/workflows` — a single
 * source of truth shared with the schema, autocomplete, and other consumers.
 */
export class BuiltInStepMonacoHandler extends BaseMonacoConnectorHandler {
  constructor() {
    // Priority 80 matches the previous per-family handlers.
    // canHandle() decides membership, so the prefix list is intentionally empty.
    super('BuiltInStepMonacoHandler', 80, ['']);
  }

  canHandle(connectorType: string): boolean {
    return getBuiltInStepDefinition(connectorType) !== undefined;
  }

  async generateHoverContent(context: HoverContext): Promise<monaco.IMarkdownString | null> {
    const { connectorType, stepContext } = context;
    if (!stepContext) {
      return null;
    }

    const stepDefinition = getBuiltInStepDefinition(connectorType);
    if (!stepDefinition) {
      return null;
    }

    const example = stepDefinition.documentation?.examples?.[0];
    const bodyLines = [
      `**Step**: \`${connectorType}\``,
      '',
      `**${stepDefinition.label}** — ${stepDefinition.description}`,
      ...(example ? ['', '**Example:**', '', '```yaml', example, '```'] : []),
    ];

    return this.createMarkdownContent(
      this.prependStabilityBadgeToContent(getBuiltInStepStability(connectorType), bodyLines)
    );
  }

  getExamples(connectorType: string): ConnectorExamples | null {
    const example = getBuiltInStepDefinition(connectorType)?.documentation?.examples?.[0];
    return example ? { snippet: example } : null;
  }
}
