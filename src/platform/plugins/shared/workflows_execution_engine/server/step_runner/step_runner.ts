/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowStep } from '@kbn/workflows';
import { TemplatingEngine } from '../templating_engine';
import { ConnectorExecutor } from '../connector_executor';

export interface RunStepResult {
  output: Record<string, any> | undefined;
  error: any;
}

export class StepRunner {
  constructor(
    private connectorExecutor: ConnectorExecutor,
    private templatingEngine: TemplatingEngine
  ) {}

  public async runStep(step: WorkflowStep, context: Record<string, any>): Promise<RunStepResult> {
    const providerInputs = step.inputs || {};

    const renderedInputs = Object.entries(providerInputs).reduce((accumulator, [key, value]) => {
      if (typeof value === 'string') {
        accumulator[key] = this.templatingEngine.render('nunjucks', value, context);
      } else {
        accumulator[key] = value;
      }
      return accumulator;
    }, {} as Record<string, any>);

    try {
      const stepOutput = await this.connectorExecutor.execute(
        step.connectorType,
        step.connectorName,
        renderedInputs
      );
      return {
        output: stepOutput || undefined,
        error: undefined,
      };
    } catch (error) {
      return {
        output: undefined,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
