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
import {
  getBrokenGraphWorkflowYaml,
  getMultiStepGraphWorkflowYaml,
} from '../../fixtures/workflows';

const EXPERIMENTAL_FEATURES_SETTING = 'workflows:experimentalFeatures';
const WORKFLOW_NAME = 'Graph Recovery Test';

test.describe(
  'Workflow graph view recovery after YAML syntax error',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({
        [EXPERIMENTAL_FEATURES_SETTING]: true,
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ scoutSpace, apiServices }) => {
      await scoutSpace.uiSettings.unset(EXPERIMENTAL_FEATURES_SETTING);
      await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
    });

    test('restores all graph nodes after fixing a YAML syntax error', async ({
      pageObjects,
      apiServices,
    }) => {
      const { created } = await apiServices.workflows.bulkCreate([
        getMultiStepGraphWorkflowYaml(WORKFLOW_NAME),
      ]);
      const workflowId = created[0].id;

      await pageObjects.workflowEditor.gotoWorkflow(workflowId);
      await pageObjects.workflowEditor.switchToGraphView();

      const canvas = pageObjects.workflowEditor.graphCanvas;

      await test.step('all step nodes are visible in the initial full workflow', async () => {
        // Graph nodes render the humanized display label (deslugifyStepName),
        // not the raw step name — e.g. `step_1` renders as `Step 1`.
        for (const stepName of ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5']) {
          await expect(canvas.getByText(stepName)).toBeVisible();
        }
      });

      await test.step('introducing a YAML syntax error shows the graph warning callout', async () => {
        // The broken YAML defines only step_1 in the steps array and includes an
        // unclosed flow sequence at the root level so that YAML.parseDocument
        // reports a syntax error — exactly the partial-graph + callout state
        // the bug report describes. (Undefined YAML aliases do not produce
        // errors in doc.errors, only doc.warnings, so they cannot be used.)
        await pageObjects.workflowEditor.setYamlEditorValue(
          getBrokenGraphWorkflowYaml(WORKFLOW_NAME)
        );

        await expect(pageObjects.workflowEditor.graphYamlErrorCallout).toBeVisible();
      });

      await test.step('fixing the YAML error restores the full graph', async () => {
        // Restore the original 5-step YAML. Before the lastValidRef fix, the
        // graph could remain stuck on the partial (step_1-only) layout even
        // after the callout disappeared, because the stale cached WorkflowYaml
        // was used as the fallback when workflowDefinition came back undefined.
        await pageObjects.workflowEditor.setYamlEditorValue(
          getMultiStepGraphWorkflowYaml(WORKFLOW_NAME)
        );

        await expect(pageObjects.workflowEditor.graphYamlErrorCallout).toBeHidden();

        for (const stepName of ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5']) {
          await expect(canvas.getByText(stepName)).toBeVisible();
        }
      });
    });
  }
);
