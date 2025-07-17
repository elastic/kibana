/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { WorkflowSchema } from '@kbn/workflows';
import { RunStepResult } from '../step-runner/step-runner';
import { z } from 'zod';

export interface ContextManagerInit {
    workflowRunId: string;
    workflow: z.infer<typeof WorkflowSchema>;
    previousExecution?: Record<string, any>;
    connectorSecrets?: Record<string, any>;
    stepResults: Record<string, RunStepResult>;
    event: any;
    esApiKey: string;
}

export class WorkflowContextManager {
    private context: Record<string, any>; // Make it strongly typed
    private esClient: IScopedClusterClient;

    constructor(init: ContextManagerInit) {

        this.context = {
            workflowRunId: init.workflowRunId,
            workflow: init.workflow,
            previousExecution: init.previousExecution ?? {},
            connectorSecrets: init.connectorSecrets ?? {},
            stepResults: init.stepResults ?? {}, // we might start from previous execution with some results
            event: init.event,
        };

        this.esClient = this.createEsClient(init.esApiKey);
    }

    private createEsClient(apiKey: string): IScopedClusterClient {
        return {} as IScopedClusterClient; // Placeholder
    }

    public getEsClient(): IScopedClusterClient {
        return this.esClient;
    }

    public getContext(): Record<string, any> {
        return { ...this.context };
    }

    public updateContext(updates: Record<string, any>): void {
        Object.assign(this.context, updates);
    }

    public appendStepResult(stepId: string, result: RunStepResult): void {
        this.context.stepResults[stepId] = result
    }

    public getContextKey(key: string): any {
        return this.context[key];
    }

    public getStepResults(): { [stepId: string]: RunStepResult } {
        return this.context.stepResults;
    }
}