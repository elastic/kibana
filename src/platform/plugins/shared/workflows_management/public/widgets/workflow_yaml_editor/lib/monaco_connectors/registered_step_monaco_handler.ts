/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { StepTypeDefinition } from '@kbn/workflows';
import type { ActionContext, HoverContext } from '../monaco_providers/provider_interfaces';
import type { ActionInfo } from '../monaco_providers/types';
import { BaseMonacoConnectorHandler } from './base_monaco_connector_handler';

/**
 * Handler for registered custom step types.
 * Provides hover documentation and actions for steps registered via the registerStepType API.
 */
export class RegisteredStepMonacoHandler extends BaseMonacoConnectorHandler {
  constructor(private registeredStepTypes: StepTypeDefinition[]) {
    // Higher priority than generic handler (10) to catch registered steps first
    super(15);
  }

  /**
   * Check if this handler can handle the given connector type
   */
  canHandle(connectorType: string): boolean {
    return this.registeredStepTypes.some((step) => step.id === connectorType);
  }

  /**
   * Get the step definition for a given type
   */
  private getStepDefinition(connectorType: string): StepTypeDefinition | undefined {
    return this.registeredStepTypes.find((step) => step.id === connectorType);
  }

  /**
   * Generate hover content for registered custom steps
   */
  async generateHoverContent(context: HoverContext): Promise<monaco.IMarkdownString | null> {
    try {
      const { connectorType } = context;
      const stepDef = this.getStepDefinition(connectorType);

      if (!stepDef) {
        return null;
      }

      const doc = stepDef.documentation;
      const content: string[] = [];

      // Title and Summary
      content.push(`**${stepDef.title}**`);
      content.push('');
      
      // Summary/Description (use documentation.summary if available, otherwise use description)
      const summary = doc?.summary || stepDef.description;
      if (summary) {
        content.push(summary);
        content.push('');
      }

      // Details
      if (doc?.details) {
        content.push(doc.details);
        content.push('');
      }

      // Documentation URL
      if (doc?.url) {
        content.push(
          `📖 **[View Documentation](${doc.url})** - Opens in new tab`
        );
        content.push('');
      }

      // Usage examples
      if (doc?.examples && doc.examples.length > 0) {
        content.push('### Examples');
        content.push('');
        for (const example of doc.examples) {
          content.push('```yaml');
          content.push(example);
          content.push('```');
          content.push('');
        }
      } else {
        // Default example if none provided
        content.push('### Usage');
        content.push('```yaml');
        content.push(`- name: myStep`);
        content.push(`  type: ${stepDef.id}`);
        content.push(`  with:`);
        content.push(`    # Configure step parameters here`);
        content.push('```');
        content.push('');
      }

      // Tip
      content.push('---');
      content.push(
        '_💡 Tip: Press Ctrl+Space (Ctrl+I on Mac) inside the "with:" block for parameter suggestions_'
      );

      return this.createMarkdownContent(content.join('\n'));
    } catch (error) {
      // console.warn('RegisteredStepMonacoHandler: Error generating hover content', error);
      return null;
    }
  }

  /**
   * Generate actions for registered custom steps
   */
  async generateActions(context: ActionContext): Promise<ActionInfo[]> {
    const actions: ActionInfo[] = [];
    const { connectorType } = context;
    const stepDef = this.getStepDefinition(connectorType);

    if (!stepDef?.documentation?.url) {
      return actions;
    }

    // Add documentation link action
    actions.push({
      id: 'view-docs',
      icon: '📖',
      label: 'View Documentation',
      tooltip: 'Open step documentation in new tab',
      callback: () => {
        if (stepDef.documentation?.url) {
          window.open(stepDef.documentation.url, '_blank', 'noopener,noreferrer');
        }
      },
    });

    return actions;
  }
}

