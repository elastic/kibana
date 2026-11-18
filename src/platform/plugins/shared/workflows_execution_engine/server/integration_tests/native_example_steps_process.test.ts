/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'node:path';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { REPO_ROOT } from '@kbn/repo-info';
import { createServerStepRegistry } from '@kbn/workflows-extensions/server';
import type { WorkflowStepsRegistry } from '@kbn/workflows-extensions/server';
import {
  startWorkflowProcessHarness,
  WORKFLOW_PROCESS_TEST_MODES,
} from './workflow_process_harness';

describe.each(WORKFLOW_PROCESS_TEST_MODES)(
  'Native workflow example and registry guard in $mode/$reuse',
  ({ mode, reuse }) => {
    let harness: Awaited<ReturnType<typeof startWorkflowProcessHarness>>;
    const parity: Array<{ kind: string; ids: string[] }> = [];
    beforeAll(async () => {
      const main = createServerStepRegistry(loggingSystemMock.createLogger());
      const { registerStepDefinitions } = jest.requireActual<{
        registerStepDefinitions: (registry: WorkflowStepsRegistry) => void;
      }>(join(REPO_ROOT, 'examples/workflows_extensions_example/server/step_types'));
      const { registerTriggers } = jest.requireActual<{
        registerTriggers: (registry: WorkflowStepsRegistry) => void;
      }>(join(REPO_ROOT, 'examples/workflows_extensions_example/server/triggers'));
      registerStepDefinitions(main);
      registerTriggers(main);
      await main.isReady();
      parity.push({ kind: 'connectorTypes', ids: ['.http'] });
      harness = await startWorkflowProcessHarness({
        mode,
        reuse,
        parity,
        settings: { workflowsExtensionsExample: {} },
        workflows: {
          example: {
            steps: [
              { name: 'variables', type: 'example.setVariable', with: { variables: { count: 7 } } },
              {
                name: 'external',
                type: 'example.externalStep',
                proxy: { id: 'example' },
                with: { input: 'native' },
              },
              {
                name: 'report',
                type: 'example.durablePollDemo',
                with: { indexPattern: 'logs-*', simulatedRenderPolls: 1 },
              },
              {
                name: 'job',
                type: 'example.pollOnlyJobDemo',
                with: { jobId: 'native-job', simulatedStatusPolls: 1 },
              },
            ],
          },
          blocked: { steps: [{ name: 'write', type: 'data.set', with: { value: 'unexpected' } }] },
          // Uses a step type nothing registers: `assertRunnableInProcessPreflight` declines this
          // one run because it needs what the process lacks, without touching unrelated runs
          // (`connectorTypes`'s blanket check below is the only kind that still declines every run).
          unsupportedStep: {
            steps: [{ name: 'x', type: 'test.missing-native-registration', with: {} }],
          },
        },
      });
    });
    afterAll(async () => harness?.stop());

    it('executes the eager, lazy and polling examples with Main registration metadata', async () => {
      const failure = jest.fn();
      await harness.run('example', failure);
      expect(failure).not.toHaveBeenCalled();
      const [execution] = await harness.executionsOf('example');
      expect(execution).toEqual(expect.objectContaining({ status: 'completed' }));
      const steps = await harness.stepsOf(execution.id);
      const output = (id: string) => {
        const step = steps.find(({ stepId }) => stepId === id);
        if (!step) throw new Error(`Missing example step ${id}`);
        return step.output.output ?? step.output;
      };
      expect(output('variables')).toEqual({ variables: { count: 7 } });
      expect(output('external')).toEqual({ response: 'success' });
      expect(output('report')).toEqual(expect.objectContaining({ totalHits: 42 }));
      expect(output('job')).toEqual(
        expect.objectContaining({ jobId: 'native-job', status: 'completed' })
      );
      expect(harness.kibanaRequests).toEqual([]);
    });

    it('rejects a missing connectorTypes registration before execution writes, for every run', async () => {
      const entry = parity.find((item) => item.kind === 'connectorTypes');
      if (!entry) throw new Error('Missing Main parity fixture connectorTypes');
      entry.ids.push('test.missing-native-registration');
      const failure = jest.fn();
      try {
        await expect(harness.run('blocked', failure)).rejects.toThrow(
          'test.missing-native-registration'
        );
        expect(failure).toHaveBeenCalledTimes(1);
        expect(await harness.executionsOf('blocked')).toEqual([]);
        expect(harness.kibanaRequests).toEqual([]);
      } finally {
        entry.ids.pop();
      }
    });

    it('declines only the run that uses a step type the process lacks, not unrelated runs', async () => {
      const failure = jest.fn();
      await expect(harness.run('unsupportedStep', failure)).rejects.toThrow(
        'test.missing-native-registration'
      );
      expect(failure).toHaveBeenCalledTimes(1);
      expect(await harness.executionsOf('unsupportedStep')).toEqual([]);

      // The same process, asked for a run it can serve, is unaffected: a pack-scoped process
      // missing some of Kibana's registered step/trigger types must not decline every run.
      const otherFailure = jest.fn();
      await harness.run('blocked', otherFailure);
      expect(otherFailure).not.toHaveBeenCalled();
    });
  }
);
