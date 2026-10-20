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

const EXPERIMENTAL_FEATURES_SETTING = 'workflows:experimentalFeatures';
const INDEX_NAME = 'scout-national-parks-authoring';

test.describe(
  'Workflow graph authoring — build a workflow from scratch on the canvas',
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

    test.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(EXPERIMENTAL_FEATURES_SETTING);
    });

    // Builds the "🏔️ National Parks Demo" shape entirely through graph
    // gestures (trigger → wire "+" → Actions menu → step flyout), the same
    // way a user would, rather than pasting YAML — exercising insertion,
    // branching, looping and the step flyout together. Nothing is saved:
    // this is pure client-side editor state, so no workflow is left behind
    // to clean up.
    test('builds an index/search/loop workflow via the graph canvas', async ({
      pageObjects,
      page,
    }) => {
      const { workflowEditor, workflowGraphAuthoring: authoring } = pageObjects;

      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await test.step('starts a new workflow, landing on the graph canvas', async () => {
        await workflowEditor.gotoNewWorkflow();
        await workflowEditor.graphCanvas.waitFor({ state: 'visible' });
      });

      await test.step('adds a Manual trigger', async () => {
        await authoring.openAddTriggerFromEmptyCanvas();
        await authoring.pickTrigger('Manual');
        await authoring.saveTrigger();
      });

      await test.step('adds get_index (Check indices)', async () => {
        await authoring.openAddStepFromWire({ mode: 'prepend-step' });
        await authoring.pickActionFromMenu('Check indices');
        await authoring.setStepFieldValue('with.index', INDEX_NAME);
        await authoring.renameCurrentStep('get_index');
        await authoring.closeStepPanel();
      });

      await test.step('adds check_if_index_exists (If Condition) with both branches', async () => {
        await authoring.openAddStepFromWire({ mode: 'after', stepName: 'get_index' });
        await authoring.pickActionFromMenu('If Condition');
        await authoring.setStepFieldValue('condition', 'steps.get_index.output.result : true');
        await authoring.renameCurrentStep('check_if_index_exists');
        await authoring.closeStepPanel();

        await authoring.openAddStepFromWire({
          mode: 'branch',
          stepName: 'check_if_index_exists',
          branchKind: 'steps',
        });
        await authoring.pickActionFromMenu('Delete indices');
        await authoring.setStepFieldValue('with.index', INDEX_NAME);
        await authoring.renameCurrentStep('delete_index');
        await authoring.closeStepPanel();

        await authoring.openAddStepFromWire({
          mode: 'branch',
          stepName: 'check_if_index_exists',
          branchKind: 'else',
        });
        await authoring.pickActionFromMenu('Check indices');
        await authoring.setStepFieldValue('with.index', INDEX_NAME);
        await authoring.renameCurrentStep('no_index_found');
        await authoring.closeStepPanel();
      });

      await test.step('adds create_parks_index (Create an index) after the branches join', async () => {
        await authoring.openAddStepFromWire({ mode: 'after', stepName: 'check_if_index_exists' });
        await authoring.pickActionFromMenu('Create an index');
        await authoring.setStepFieldValue('with.index', INDEX_NAME);
        await authoring.setStepFieldJSON('with.mappings', {
          properties: {
            name: { type: 'text' },
            category: { type: 'keyword' },
          },
        });
        await authoring.renameCurrentStep('create_parks_index');
        await authoring.closeStepPanel();
      });

      await test.step('adds bulk_index_park_data (Bulk index or delete documents)', async () => {
        await authoring.openAddStepFromWire({ mode: 'after', stepName: 'create_parks_index' });
        await authoring.pickActionFromMenu('Bulk index or delete documents');
        await authoring.setStepFieldValue('with.index', INDEX_NAME);

        // Regression guard: `operations` is a required `with.*` field shaped as
        // an array of unions. It must render as a primary Inputs field, not be
        // silently hidden by the nested-steps-array heuristic (which must only
        // apply to root-level step arrays like `if.steps`/`else`, never to a
        // connector's `with.*` fields).
        await expect(authoring.stepField('with.operations')).toBeVisible();
        await authoring.setStepFieldJSON('with.operations', [
          { index: {} },
          { name: 'Yellowstone National Park', category: 'geothermal' },
          { index: {} },
          { name: 'Grand Canyon National Park', category: 'canyon' },
        ]);
        await authoring.renameCurrentStep('bulk_index_park_data');
        await expect(authoring.stepConfigPanel).toBeVisible();
      });

      await test.step('regression: adding then removing an optional field does not crash the editor', async () => {
        // Covers the bug where removing a never-populated optional field threw
        // inside yaml's `deleteIn` (missing `with` map) and took the whole app
        // down. `elasticsearch.bulk` is the type that first surfaced it: every
        // other field is optional, so its default fragment has no `with:` map
        // until a value is written.
        await authoring.addOptionalField('with.pipeline');
        await expect(authoring.stepField('with.pipeline')).toBeVisible();

        await authoring.removeOptionalField('with.pipeline');

        // The crash this guards against replaced the whole app with Kibana's
        // error-boundary page — assert the editor (panel + canvas) is still
        // the thing rendered, not a recovery/error screen.
        await expect(authoring.stepField('with.pipeline')).toBeHidden();
        await expect(authoring.stepConfigPanel).toBeVisible();
        await expect(workflowEditor.graphCanvas).toBeVisible();
        expect(pageErrors).toStrictEqual([]);

        await authoring.closeStepPanel();
      });

      await test.step('adds search_park_data (Run a search)', async () => {
        await authoring.openAddStepFromWire({ mode: 'after', stepName: 'bulk_index_park_data' });
        await authoring.pickActionFromMenu('Run a search');
        await authoring.setStepFieldValue('with.index', INDEX_NAME);
        await authoring.setStepFieldValue('with.size', '5');
        await authoring.setStepFieldJSON('with.query', { term: { category: 'canyon' } });
        await authoring.renameCurrentStep('search_park_data');
        await authoring.closeStepPanel();
      });

      await test.step('adds loop_over_results (Loop (foreach)) with a nested step', async () => {
        await authoring.openAddStepFromWire({ mode: 'after', stepName: 'search_park_data' });
        await authoring.pickActionFromMenu('Loop (foreach)');
        await authoring.setStepFieldValue(
          'foreach',
          '{{steps.search_park_data.output.hits.hits | json}}'
        );
        await authoring.renameCurrentStep('loop_over_results');
        await authoring.closeStepPanel();

        await authoring.openAddFirstStepInGroup();
        await authoring.pickActionFromMenu('Check indices');
        await authoring.setStepFieldValue('with.index', INDEX_NAME);
        await authoring.renameCurrentStep('process_item');
        await authoring.closeStepPanel();
      });

      await test.step('the produced YAML reflects every authored step', async () => {
        const yaml = await workflowEditor.getYamlEditorValue();

        expect(yaml).toContain('type: manual');
        for (const [name, type] of [
          ['get_index', 'elasticsearch.indices.exists'],
          ['check_if_index_exists', 'if'],
          ['delete_index', 'elasticsearch.indices.delete'],
          ['no_index_found', 'elasticsearch.indices.exists'],
          ['create_parks_index', 'elasticsearch.indices.create'],
          ['bulk_index_park_data', 'elasticsearch.bulk'],
          ['search_park_data', 'elasticsearch.search'],
          ['loop_over_results', 'foreach'],
          ['process_item', 'elasticsearch.indices.exists'],
        ]) {
          expect(yaml).toContain(`name: ${name}`);
          expect(yaml).toContain(`type: ${type}`);
        }
        // The optional field added-then-removed mid-flow must not have left
        // a `pipeline:` key behind on the bulk step.
        expect(yaml).not.toContain('pipeline:');
      });
    });
  }
);
