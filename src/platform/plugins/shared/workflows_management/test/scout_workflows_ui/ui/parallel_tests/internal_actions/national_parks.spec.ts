/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../../fixtures';
import { cleanupWorkflowsAndRules } from '../../fixtures/cleanup';
import { EXECUTION_TIMEOUT } from '../../fixtures/constants';
import { nationalParksWorkflow } from '../../fixtures/workflows';

test.describe('InternalActions/Elasticsearch', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: {
        cluster: ['manage_index_templates'],
        indices: [
          {
            names: ['national-parks'],
            privileges: ['create_index', 'read', 'view_index_metadata', 'write', 'delete_index'],
          },
        ],
      },
      kibana: [
        {
          base: ['all'],
          feature: {},
          spaces: ['*'],
        },
      ],
    });
  });

  test.afterAll(async ({ scoutSpace, apiServices }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
  });

  test('should run national park workflow successfully', async ({ page, pageObjects }) => {
    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(nationalParksWorkflow);
    await page.testSubj.click('runWorkflowHeaderButton');
    await page.testSubj.waitForSelector('runWorkflowWithUnsavedChangesConfirmationModal');
    await page.testSubj.click('confirmModalConfirmButton');

    await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

    await pageObjects.workflowExecution.expandStepsTree();

    // verify output of create_parks_index
    const createParksIndexStep = await pageObjects.workflowExecution.getStep('create_parks_index');
    await createParksIndexStep.click();
    expect(
      await pageObjects.workflowExecution.getStepResultJson<Record<string, unknown>>('output')
    ).toStrictEqual({
      acknowledged: true,
      shards_acknowledged: true,
      index: 'national-parks',
    });

    // verify output of bulk_index_park_data
    const bulkIndexParkDataStep = await pageObjects.workflowExecution.getStep(
      'bulk_index_park_data'
    );
    await bulkIndexParkDataStep.click();
    const bulkIndexOutput = await pageObjects.workflowExecution.getStepResultJson<
      Record<string, unknown>
    >('output');
    expect(bulkIndexOutput.errors).toBe(false);
    expect(bulkIndexOutput.items).toHaveLength(5);

    // verify output of search_park_data
    const searchParkDataStep = await pageObjects.workflowExecution.getStep('search_park_data');
    await searchParkDataStep.click();
    const searchParkOutput = await pageObjects.workflowExecution.getStepResultJson<{
      hits: {
        total: { value: number };
        hits: unknown[];
      };
    }>('output');
    expect(searchParkOutput.hits).toBeDefined();
    expect(searchParkOutput.hits.total.value).toBe(2);
    expect(searchParkOutput.hits.hits).toHaveLength(2);

    // verify outputs of process-item
    const requiredOutputs = ['Grand Canyon National Park', 'Zion National Park'];

    for (let i = 0; i < requiredOutputs.length; i++) {
      const step = await pageObjects.workflowExecution.getStep(
        `loop_over_results > ${i} > process-item`
      );
      await step.click();

      const stepOutput = await pageObjects.workflowExecution.getStepResultJson<string>('output');
      expect(stepOutput).toBe(requiredOutputs[i]);
    }
  });
});
