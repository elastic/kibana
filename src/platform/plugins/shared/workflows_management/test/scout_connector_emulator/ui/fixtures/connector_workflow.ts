/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { LONG_EXECUTION_TIMEOUT } from '../../../scout/ui/fixtures/constants';
import type { WorkflowsPageObjects } from '../../../scout/ui/fixtures/page_objects';

/**
 * For a demo, CONNECTOR_EMULATOR_DEMO_PAUSE_SECONDS makes the workflow wait that long after each
 * step, and the test stay that long on each step's result once it has completed, so what each step
 * returned can be read. Without it nothing waits.
 */
const parsedPause = Number(process.env.CONNECTOR_EMULATOR_DEMO_PAUSE_SECONDS);
export const PAUSE_SECONDS = Number.isFinite(parsedPause) && parsedPause > 0 ? parsedPause : 0;

/** A step that calls one action of a connector: its name, its type (`<connector>.<action>`), inputs. */
export type ConnectorStep = readonly [name: string, type: string, params: Record<string, unknown>];

const indent = (lines: string, by: number) =>
  lines
    .split('\n')
    .map((line) => `${' '.repeat(by)}${line}`)
    .join('\n');

// JSON is YAML, and quoting every string keeps YAML from reading "0:1" as a number.
const toYaml = (value: Record<string, unknown>) =>
  Object.entries(value)
    .map(([key, item]) => `${key}: ${JSON.stringify(item)}`)
    .join('\n');

/**
 * A workflow with one step per action of a connector. With `pauseSeconds`, a wait step follows each
 * of them, so what a step returned can be read in the execution view before the next one runs.
 */
export const getConnectorWorkflowYaml = ({
  title,
  connectorId,
  steps,
  pauseSeconds = 0,
}: {
  title: string;
  connectorId: string;
  steps: readonly ConnectorStep[];
  pauseSeconds?: number;
}): string => {
  const yamlSteps = steps.flatMap(([name, type, params]) => [
    `  - name: ${name}
    type: ${type}
    connector-id: ${connectorId}${
      Object.keys(params).length === 0
        ? ''
        : `
    with:
${indent(toYaml(params), 6)}`
    }
`,
    ...(pauseSeconds > 0
      ? [
          `  - name: pause_after_${name}
    type: wait
    with:
      duration: ${pauseSeconds}s
`,
        ]
      : []),
  ]);
  return `name: ${title} through the connector emulator
description: Runs actions of the ${title} connector, which the connector emulator answers
enabled: true
triggers:
  - type: manual
steps:
${yamlSteps.join('\n')}`;
};

/**
 * Saves and runs a workflow, waits for it to complete, and returns what opens a step's result in
 * the execution view (and stays on it for a demo).
 */
export const runWorkflow = async (
  { page, pageObjects }: { page: ScoutPage; pageObjects: WorkflowsPageObjects },
  { yaml, stepNames }: { yaml: string; stepNames: readonly string[] }
) => {
  await pageObjects.workflowEditor.gotoNewWorkflow();
  await pageObjects.workflowEditor.setYamlEditorValue(yaml);
  await pageObjects.workflowEditor.saveWorkflow();

  await pageObjects.workflowEditor.clickRunButton();
  await pageObjects.workflowExecution.waitForExecutionStatus(
    'completed',
    LONG_EXECUTION_TIMEOUT + PAUSE_SECONDS * stepNames.length * 1000
  );
  await pageObjects.workflowExecution.expandStepsTree();

  return async <T>(step: string, type: 'input' | 'output' = 'output'): Promise<T> => {
    await (await pageObjects.workflowExecution.getStep(step)).click();
    const result = await pageObjects.workflowExecution.getStepResultJson<T>(type);
    if (PAUSE_SECONDS > 0) {
      await page.waitForTimeout(PAUSE_SECONDS * 1000);
    }
    return result;
  };
};
