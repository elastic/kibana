/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RunStepResult, StepBase } from './step-base';
import { z } from '@kbn/zod';
import { BaseConnectorStepSchema } from '@kbn/workflows'; // Adjust path as needed

type ConnectorStepDefinition = z.infer<typeof BaseConnectorStepSchema>;

export class ConnectorStep extends StepBase {
    constructor(...args: ConstructorParameters<typeof StepBase>) {
        super(...args);
    }

    public async _run(): Promise<RunStepResult> {
        const step = this.step as ConnectorStepDefinition;

        // Evaluate optional 'if' condition
        const shouldRun = await this.evaluateCondition(step.if);
        if (!shouldRun) {
            return { output: undefined, error: undefined };
        }

        // Get current context for templating
        const context = this.contextManager.getContext();

        // Render inputs from 'with'
        const renderedInputs = Object.entries(step.with ?? {}).reduce((acc: Record<string, any>, [key, value]) => {
            if (typeof value === 'string') {
                acc[key] = this.templatingEngine.render(value, context);
            } else {
                acc[key] = value;
            }
            return acc;
        }, {});

        // Execute the connector
        try {
            // TODO: remove this once we have a proper connector executor/step for console
            if (step.type === 'console.log' || step.type === 'console') {
                console.log(step.with?.message);
                return { output: step.with?.message, error: undefined };
            } else if (step.type === 'console.sleep') {
                await new Promise(resolve => setTimeout(resolve, step.with?.sleepTime ?? 1000));
                console.log(`${step.with?.message} - slept for ${step.with?.sleepTime ?? 1000}ms`);
                return { output: step.with?.message, error: undefined };
            }

            const output = await this.connectorExecutor.execute(
                step.type, // e.g., 'slack.sendMessage'
                step['connector-id']!,
                renderedInputs
            );
            return { output, error: undefined };
        } catch (error) {
            return await this.handleFailure(error);
        }
    }
}