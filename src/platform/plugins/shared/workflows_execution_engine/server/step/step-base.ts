import { WorkflowContextManager } from '../workflow-context-manager/workflow-context-manager';
import { BaseStepSchema } from '@kbn/workflows';
// Import specific step types as needed from schema
import { z } from '@kbn/zod';
// import { evaluate } from '@marcbachmann/cel-js'
import { WorkflowTemplatingEngine } from '../templating-engine';
import { ConnectorExecutor } from '../connector-executor';

export interface RunStepResult {
    output: any;
    error: any;
}

export type StepDefinition = z.infer<typeof BaseStepSchema>; // Base type; subclasses will use specific inferred types

export abstract class StepBase {
    protected step: StepDefinition;
    protected contextManager: WorkflowContextManager;
    protected templatingEngine: WorkflowTemplatingEngine;
    protected connectorExecutor: ConnectorExecutor;

    constructor(
        step: StepDefinition,
        contextManager: WorkflowContextManager,
        connectorExecutor: ConnectorExecutor,
        templatingEngineType: 'mustache' | 'nunjucks' = 'nunjucks',
    ) {
        this.step = step;
        this.contextManager = contextManager;
        this.templatingEngine = new WorkflowTemplatingEngine(templatingEngineType);
        this.connectorExecutor = connectorExecutor;
    }

    public getName(): string {
        return this.step.name;
    }

    public async run(): Promise<RunStepResult> {
        const result = await this._run();
        this.contextManager.appendStepResult(this.getName(), result);
        return result;
    }

    // Subclasses implement this to execute the step logic
    protected abstract _run(): Promise<RunStepResult>;

    // Helper to handle common logic like condition evaluation, retries, etc.
    protected async evaluateCondition(condition: string | undefined): Promise<boolean> {
        if (!condition) return true;
        // Use templating engine to evaluate condition with context
        // For now, placeholder: assume it's true if condition exists
        // Integrate with TemplatingEngine in actual implementation
        const context = this.contextManager.getContext();
        const parsedCondition = this.templatingEngine.render(condition, context);
        // return evaluate(parsedCondition, context);
        return true;
    }

    // Helper for handling on-failure, retries, etc.
    protected async handleFailure(error: any): Promise<RunStepResult> {
        // Implement retry logic based on step['on-failure']
        return {
            output: undefined,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}