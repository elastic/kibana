/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManualWorkflowEventDefinition } from '@kbn/workflows-extensions/common';
import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';

class ManualWorkflowEventSchemas {
  private extensions: WorkflowsExtensionsPublicPluginStart | null = null;

  public initialize(workflowsExtensions: WorkflowsExtensionsPublicPluginStart): void {
    this.extensions = workflowsExtensions;
  }

  public getRegisteredIds(): string[] {
    return (
      this.extensions?.getAllManualWorkflowEventDefinitions().map((definition) => definition.id) ??
      []
    );
  }

  public getDefinition(id: string): ManualWorkflowEventDefinition | undefined {
    return this.extensions?.getManualWorkflowEventDefinition(id);
  }
}

export const manualWorkflowEventSchemas = new ManualWorkflowEventSchemas();
export type { ManualWorkflowEventSchemas };
