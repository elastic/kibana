import { WorkflowStep, Provider } from '../from-poc/models';
import { TemplatingEngine } from '../templating-engine';

export interface RunStepResult {
  output: Record<string, any> | undefined;
  error: any;
}

export class StepRunner {
  /**
   *
   */
  constructor(
    private providers: Record<string, Provider>,
    private templatingEngine: TemplatingEngine
  ) {}

  public async runStep(step: WorkflowStep, context: Record<string, any>): Promise<RunStepResult> {
    const stepProvider = this.providers[step.providerName]; // integrate with connector

    if (!stepProvider) {
      throw new Error(`Provider "${step.providerName}" not found`);
    }

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
      const stepOutput = await stepProvider.action(renderedInputs);
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
