/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Self-correction loop evals.
 *
 * Seed the conversation with broken YAML (syntactic or semantic), ask the
 * agent to fix it, and measure how many turns it takes to produce a valid
 * workflow. The complement to PR 2's negative cases: PR 2 measures terminal
 * refusal; this measures recoverable repair.
 *
 * After each turn, the spec tries to parse the YAML produced so far. If
 * parsing succeeds AND the workflow has a top-level steps array, that turn
 * counts as recovery. The createSelfCorrectionEvaluator scores recovery vs.
 * the maxTurns budget.
 *
 * Per security-team#17191.
 */

import { parse as parseYaml } from 'yaml';
import { tags } from '@kbn/scout';
import type { EvaluationDataset } from '@kbn/evals';
import { selectEvaluators } from '@kbn/evals';
import { evaluate as base } from '../src/evaluate';
import type { SelfCorrectionExample, WorkflowTaskOutput } from '../src/types';
import {
  createSelfCorrectionEvaluator,
  createCriteriaEvaluator,
  createNoErrorsEvaluator,
  skipInfraErrors,
  extractResultYaml,
  extractYamlFromAttachments,
} from '../src/evaluators';

const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml';

/** Considered recovered if the produced YAML parses to an object with a steps array. */
const isRecoveredYaml = (yaml: string | undefined): boolean => {
  if (!yaml) return false;
  try {
    const parsed = parseYaml(yaml);
    if (!parsed || typeof parsed !== 'object') return false;
    const { steps } = parsed as { steps?: unknown };
    return Array.isArray(steps) && steps.length > 0;
  } catch {
    return false;
  }
};

const evaluate = base.extend<
  {
    evaluateSelfCorrectionDataset: (opts: {
      dataset: EvaluationDataset<SelfCorrectionExample>;
    }) => Promise<void>;
  },
  {}
>({
  evaluateSelfCorrectionDataset: [
    async ({ chatClient, evaluators, executorClient }, use) => {
      await use(async ({ dataset }) => {
        await executorClient.runExperiment(
          {
            datasets: [dataset],
            task: async ({ input, output: expected }) => {
              const startMs = Date.now();
              const maxTurns = expected.maxTurns;

              const allMessages: Array<{ message: string }> = [];
              const allSteps: NonNullable<WorkflowTaskOutput['steps']> = [];
              const allErrors: unknown[] = [];
              let conversationId: string | undefined;
              let turnsToRecovery: number | null = null;
              let finalResultYaml: string | undefined;

              for (let i = 0; i < maxTurns; i++) {
                const turnMessage =
                  i === 0
                    ? input.instruction
                    : 'The workflow still has issues — please look at the validation result and fix it.';
                const attachments =
                  i === 0
                    ? [
                        {
                          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
                          data: { yaml: input.brokenYaml },
                        },
                      ]
                    : undefined;

                const resp = await chatClient.converse({
                  messages: [{ message: turnMessage }],
                  conversationId,
                  attachments,
                });

                conversationId = resp.conversationId ?? conversationId;
                allMessages.push({ message: turnMessage });
                const lastAssistant = resp.messages[resp.messages.length - 1];
                if (lastAssistant) allMessages.push(lastAssistant);
                if (resp.steps) allSteps.push(...resp.steps);
                if (resp.errors) allErrors.push(...resp.errors);

                // Infra error → abort without partial credit; surfaced via skipInfraErrors.
                if (resp.errors.length > 0) break;

                const turnYaml = extractResultYaml({
                  messages: resp.messages,
                  steps: resp.steps,
                  errors: resp.errors,
                });

                if (isRecoveredYaml(turnYaml)) {
                  finalResultYaml = turnYaml;
                  turnsToRecovery = i + 1;
                  break;
                }
              }

              // Fall back to the latest YAML attached to the conversation if the agent
              // wrote to attachments instead of tool params on its final turn.
              if (!finalResultYaml && conversationId) {
                const attachments = await chatClient.getConversationAttachments(conversationId);
                const fallback = extractYamlFromAttachments(attachments);
                if (isRecoveredYaml(fallback)) {
                  finalResultYaml = fallback;
                  // We don't know which turn produced this — credit conservatively.
                  if (turnsToRecovery == null) turnsToRecovery = maxTurns;
                }
              }

              return {
                messages: allMessages,
                steps: allSteps,
                errors: allErrors,
                resultYaml: finalResultYaml,
                latencyMs: Date.now() - startMs,
                turnsToRecovery,
              };
            },
          },
          selectEvaluators<SelfCorrectionExample, WorkflowTaskOutput>([
            skipInfraErrors(createNoErrorsEvaluator()),
            skipInfraErrors(createSelfCorrectionEvaluator()),
            skipInfraErrors(createCriteriaEvaluator({ evaluators })),
          ])
        );
      });
    },
    { scope: 'test' },
  ],
});

// ---------------------------------------------------------------------------
// Syntax errors
// ---------------------------------------------------------------------------

evaluate.describe(
  'Self-correction: syntax errors',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('recovers from mismatched indentation', async ({ evaluateSelfCorrectionDataset }) => {
      await evaluateSelfCorrectionDataset({
        dataset: {
          name: 'workflow-self-correction: indent-mismatch',
          description: 'A workflow with broken YAML indentation. Agent should detect and fix it.',
          examples: [
            {
              input: {
                brokenYaml: `name: Broken Indent
triggers:
  - type: manual
steps:
  - name: log_start
    type: console
    with:
      message: "start"
   - name: misindented
     type: console
     with:
       message: "this step has the wrong indent and breaks parsing"
`,
                brokenKind: 'syntax',
                instruction: "This workflow isn't working — figure out what's wrong and fix it.",
              },
              output: {
                maxTurns: 3,
                criteria: [
                  'The final workflow YAML parses without errors.',
                  'All originally intended steps are present (log_start and the second console step).',
                  'The trigger type is still manual.',
                  'The agent diagnosed the indentation issue itself (its messages should mention indent / alignment / parse error before fixing).',
                ],
              },
              metadata: { category: 'self-correction-syntax' },
            },
          ],
        },
      });
    });
  }
);

// ---------------------------------------------------------------------------
// Semantic errors (parse fine but won't run correctly)
// ---------------------------------------------------------------------------

evaluate.describe(
  'Self-correction: semantic errors',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate(
      'recovers from reference to nonexistent step output',
      async ({ evaluateSelfCorrectionDataset }) => {
        await evaluateSelfCorrectionDataset({
          dataset: {
            name: 'workflow-self-correction: missing-step-ref',
            description:
              'A Liquid expression references a step that does not exist in the workflow.',
            examples: [
              {
                input: {
                  brokenYaml: `name: Broken Reference
triggers:
  - type: manual
steps:
  - name: fetch
    type: http
    with:
      method: GET
      url: "https://api.example.com/users"
  - name: log
    type: console
    with:
      message: "Got {{ steps.fetch_users.output.count }} users"
`,
                  brokenKind: 'semantic',
                  instruction:
                    "I tried to run this and it doesn't work as expected — the log line ends up with a blank/missing value. Figure out why and fix it.",
                },
                output: {
                  maxTurns: 3,
                  criteria: [
                    'The log message references the actual fetch step name (steps.fetch), not a name that does not exist (e.g. steps.fetch_users).',
                    'The output path on the reference is reasonable for an HTTP step (e.g. output, output.body, output.data).',
                    'The fetch step itself is unchanged.',
                    'The agent diagnosed the broken reference itself (its messages should mention the wrong step name / missing reference before fixing).',
                  ],
                },
                metadata: { category: 'self-correction-semantic' },
              },
            ],
          },
        });
      }
    );
  }
);
