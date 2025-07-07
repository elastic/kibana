import { WorkflowStep, Provider } from '../models';

export interface RunStepResult {
  output: Record<string, any> | undefined;
  error: any;
}

export class StepRunner {
  /**
   *
   */
  constructor(private providers: Record<string, Provider>) {}

  public async runStep(step: WorkflowStep, context: Record<string, any>): Promise<RunStepResult> {
    const stepProvider = this.providers[step.providerName]; // integrate with connector

    if (!stepProvider) {
      throw new Error(`Provider "${step.providerName}" not found`);
    }

    const providerInputs = step.inputs || {};

    try {
      const stepOutput = await stepProvider.action(providerInputs, context);
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
