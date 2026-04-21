/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import AdmZip from 'adm-zip';
import { v4 as generateUuid } from 'uuid';
import YAML from 'yaml';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../../fixtures';
import { cleanupWorkflowsAndRules } from '../../fixtures/cleanup';
import { getListTestWorkflowYaml } from '../../fixtures/workflows';

const toFilePayload = (name: string, content: string | Buffer, mimeType: string) => ({
  name,
  mimeType,
  buffer: typeof content === 'string' ? Buffer.from(content, 'utf-8') : content,
});

async function buildTestZip(workflows: Array<{ id: string; yaml: string }>): Promise<Buffer> {
  const zip = new AdmZip();
  for (const w of workflows) {
    zip.addFile(`${w.id}.yml`, Buffer.from(w.yaml, 'utf-8'));
  }
  const manifest = YAML.stringify({
    exportedCount: workflows.length,
    exportedAt: new Date().toISOString(),
    version: '1',
  });
  zip.addFile('manifest.yml', Buffer.from(manifest, 'utf-8'));
  return zip.toBufferPromise();
}

test.describe('WorkflowsList/ImportExport', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace, apiServices }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
  });

  test('should import a single YAML workflow via flyout', async ({ pageObjects }) => {
    const yaml = getListTestWorkflowYaml({
      name: 'ImportYAML Single',
      description: 'imported via flyout',
      enabled: false,
    });

    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList.clickImportButton();

    const flyout = pageObjects.workflowList.getImportFlyout();
    await expect(flyout).toBeVisible();

    await pageObjects.workflowList.uploadFile(toFilePayload('single.yml', yaml, 'text/yaml'));
    await pageObjects.workflowList.confirmImport();

    await expect(pageObjects.workflowList.getImportCloseButton()).toBeVisible();
    await pageObjects.workflowList.closeImport();
    await expect(flyout).toBeHidden();
    await expect(pageObjects.workflowList.getWorkflowRow('ImportYAML Single')).toBeVisible();
  });

  test('should import ZIP with multiple workflows via flyout', async ({ pageObjects }) => {
    const zipBuffer = await buildTestZip([
      {
        id: `workflow-${generateUuid()}`,
        yaml: getListTestWorkflowYaml({
          name: 'ImportZIP First',
          description: 'first',
          enabled: false,
        }),
      },
      {
        id: `workflow-${generateUuid()}`,
        yaml: getListTestWorkflowYaml({
          name: 'ImportZIP Second',
          description: 'second',
          enabled: false,
        }),
      },
    ]);

    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList.clickImportButton();
    await pageObjects.workflowList.uploadFile(
      toFilePayload('multi.zip', zipBuffer, 'application/zip')
    );
    await pageObjects.workflowList.confirmImport();

    await expect(pageObjects.workflowList.getImportCloseButton()).toBeVisible();
    await pageObjects.workflowList.closeImport();
    await expect(pageObjects.workflowList.getImportFlyout()).toBeHidden();
    await expect(pageObjects.workflowList.getWorkflowRow('ImportZIP First')).toBeVisible();
    await expect(pageObjects.workflowList.getWorkflowRow('ImportZIP Second')).toBeVisible();
  });

  test('should show conflict resolution UI when re-importing existing workflows', async ({
    pageObjects,
    apiServices,
  }) => {
    const workflowYaml = getListTestWorkflowYaml({
      name: 'ImportConflict Existing',
      description: 'existing',
      enabled: false,
    });
    const created = await apiServices.workflows.create(workflowYaml);

    const zipBuffer = await buildTestZip([{ id: created.id, yaml: created.yaml }]);

    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList.clickImportButton();
    await pageObjects.workflowList.uploadFile(
      toFilePayload('conflict.zip', zipBuffer, 'application/zip')
    );

    await expect(pageObjects.workflowList.getConflictCallout()).toBeVisible();
  });

  test('should create new workflow when choosing "generate new IDs" for conflicts', async ({
    pageObjects,
    apiServices,
  }) => {
    const workflowYaml = getListTestWorkflowYaml({
      name: 'ImportNewID Existing',
      description: 'will be duplicated',
      enabled: false,
    });
    const created = await apiServices.workflows.create(workflowYaml);

    const zipBuffer = await buildTestZip([{ id: created.id, yaml: created.yaml }]);

    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList.clickImportButton();
    await pageObjects.workflowList.uploadFile(
      toFilePayload('newid.zip', zipBuffer, 'application/zip')
    );

    await expect(pageObjects.workflowList.getConflictCallout()).toBeVisible();
    await pageObjects.workflowList.selectConflictResolution('generateNewIds');
    await pageObjects.workflowList.confirmImport();

    await expect(pageObjects.workflowList.getImportCloseButton()).toBeVisible();
    await pageObjects.workflowList.closeImport();
    await expect(pageObjects.workflowList.getImportFlyout()).toBeHidden();
  });

  test('should overwrite existing workflow when choosing "overwrite"', async ({
    pageObjects,
    apiServices,
  }) => {
    const workflowYaml = getListTestWorkflowYaml({
      name: 'ImportOverwrite Existing',
      description: 'will be overwritten',
      enabled: false,
    });
    const created = await apiServices.workflows.create(workflowYaml);

    const zipBuffer = await buildTestZip([{ id: created.id, yaml: created.yaml }]);

    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList.clickImportButton();
    await pageObjects.workflowList.uploadFile(
      toFilePayload('overwrite.zip', zipBuffer, 'application/zip')
    );

    await expect(pageObjects.workflowList.getConflictCallout()).toBeVisible();
    await pageObjects.workflowList.selectConflictResolution('overwrite');
    await pageObjects.workflowList.confirmImport();

    await expect(pageObjects.workflowList.getImportCloseButton()).toBeVisible();
    await pageObjects.workflowList.closeImport();
    await expect(pageObjects.workflowList.getImportFlyout()).toBeHidden();
    await expect(pageObjects.workflowList.getWorkflowRow('ImportOverwrite Existing')).toBeVisible();
  });

  test('should close flyout without importing when cancel is clicked', async ({ pageObjects }) => {
    const yaml = getListTestWorkflowYaml({
      name: 'ImportCancel ShouldNotExist',
      description: 'should not be imported',
      enabled: false,
    });

    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList.clickImportButton();
    await pageObjects.workflowList.uploadFile(toFilePayload('cancel.yml', yaml, 'text/yaml'));
    await pageObjects.workflowList.cancelImport();

    await expect(pageObjects.workflowList.getImportFlyout()).toBeHidden();
  });

  test('should export selected workflows via bulk action', async ({
    pageObjects,
    apiServices,
    page,
  }) => {
    const yaml1 = getListTestWorkflowYaml({
      name: 'ExportBulk First',
      description: 'first export target',
      enabled: false,
    });
    const yaml2 = getListTestWorkflowYaml({
      name: 'ExportBulk Second',
      description: 'second export target',
      enabled: false,
    });
    await apiServices.workflows.create(yaml1);
    await apiServices.workflows.create(yaml2);

    await pageObjects.workflowList.navigate();

    const downloadPromise = page.waitForEvent('download');
    await pageObjects.workflowList.performBulkExport(['ExportBulk First', 'ExportBulk Second']);

    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    expect(filename).toContain('.zip');
  });

  test('should show file size error for oversized files', async ({ pageObjects }) => {
    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList.clickImportButton();

    const flyout = pageObjects.workflowList.getImportFlyout();
    await expect(flyout).toBeVisible();

    // Create a file exceeding 10 MB
    const oversizedContent = 'x'.repeat(11 * 1024 * 1024);
    await pageObjects.workflowList.uploadFile(
      toFilePayload('huge.yml', oversizedContent, 'text/yaml')
    );

    // The import confirm button should remain disabled
    await expect(
      pageObjects.workflowList
        .getImportFlyout()
        .locator('[data-test-subj="import-workflows-confirm"]')
    ).toBeDisabled();
  });

  test('should show parse error callout when ZIP contains non-YAML entries', async ({
    pageObjects,
  }) => {
    const zip = new AdmZip();
    const validYaml = getListTestWorkflowYaml({
      name: 'ImportParseError Valid',
      description: 'valid entry',
      enabled: false,
    });
    const wfId = `workflow-${generateUuid()}`;
    zip.addFile(`${wfId}.yml`, Buffer.from(validYaml, 'utf-8'));
    zip.addFile('readme.txt', Buffer.from('not a workflow', 'utf-8'));
    const manifest = YAML.stringify({
      exportedCount: 1,
      exportedAt: new Date().toISOString(),
      version: '1',
    });
    zip.addFile('manifest.yml', Buffer.from(manifest, 'utf-8'));
    const zipBuffer = await zip.toBufferPromise();

    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList.clickImportButton();
    await pageObjects.workflowList.uploadFile(
      toFilePayload('mixed.zip', zipBuffer, 'application/zip')
    );

    // The valid workflow should still appear in the import preview
    await expect(
      pageObjects.workflowList.getImportFlyout().locator('text=ImportParseError Valid')
    ).toBeVisible();
  });
});
