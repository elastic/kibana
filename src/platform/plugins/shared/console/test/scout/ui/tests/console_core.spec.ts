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
import { DEFAULT_INPUT_VALUE } from '../../../../common/constants';
import { test } from '../fixtures';

const stripWhitespace = (value: string) => value.replace(/\s/g, '');

// Unique per worker so parallel workers cannot collide on the index name.
const multiRequestIndexName = (workerIndex: number) => `console-core-multi-request-${workerIndex}`;

test.describe('Console core', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
  });

  // The default welcome script (`DEFAULT_INPUT_VALUE`) creates `my-index` under a fixed
  // name, so it can't be made worker-unique — delete it even if a test failed partway,
  // or a later bare `GET /_search` picks up the leftover doc. The multi-request index is
  // deleted for the same reason: an interrupted run must not leave it behind, or the next
  // run's PUT would return a non-200 response.
  test.afterEach(async ({ esClient }, testInfo) => {
    await esClient.indices.delete(
      {
        index: ['my-index', multiRequestIndexName(testInfo.workerIndex)],
        ignore_unavailable: true,
      },
      { ignore: [404] }
    );
  });

  test('opens on the Shell tab with the default request and an empty output panel', async ({
    page,
    pageObjects,
  }) => {
    await test.step('the editor is preloaded with the welcome request', async () => {
      const editorText = await pageObjects.console.getEditorText();
      // Monaco only renders the lines in the viewport, so the editor holds a prefix
      // of the default value rather than all of it.
      expect(stripWhitespace(DEFAULT_INPUT_VALUE)).toContain(stripWhitespace(editorText));
    });

    await test.step('the output panel starts in its empty state', async () => {
      await expect(pageObjects.console.outputPanelEmptyState).toBeVisible();
    });

    await test.step('the shell view has no accessibility violations', async () => {
      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="consolePanel"]'],
      });
      expect(violations).toStrictEqual([]);
    });
  });

  test('runs the default requests and leaves the empty state behind', async ({ pageObjects }) => {
    await pageObjects.console.selectAllRequests();
    await pageObjects.console.sendRequest();
    await pageObjects.console.scrollOutputToBottom();

    await expect(pageObjects.console.outputEditorContent).toContainText('"timed_out": false');
    await expect(pageObjects.console.outputPanelEmptyState).toBeHidden();
  });

  test('resizes the editor with the window', async ({ page, pageObjects }) => {
    await page.setViewportSize({ width: 1300, height: 1100 });
    const initialSize = await pageObjects.console.inputEditor.boundingBox();
    // A visible editor always has a box; assert it here so a missing one fails clearly.
    expect(initialSize).not.toBeNull();

    await page.setViewportSize({ width: 1000, height: 1100 });
    await expect
      .poll(async () => (await pageObjects.console.inputEditor.boundingBox())?.width)
      .toBeLessThan(initialSize?.width ?? 0);
  });

  test('clears the input editor', async ({ pageObjects }) => {
    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText('GET _all');
    expect(await pageObjects.console.getEditorText()).toBe('GET _all');

    await pageObjects.console.clickClearInput();
    // The click clears the model asynchronously, via a React re-render, so retry the read.
    await expect.poll(() => pageObjects.console.getEditorText()).toBe('');
  });

  test('sends a request written with a mixed case method', async ({ pageObjects }) => {
    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText('Get /');
    await pageObjects.console.sendRequest();

    expect(await pageObjects.console.getResponseStatus()).toBe(200);
  });

  test('sends a request to the Kibana API with the kbn: prefix', async ({ pageObjects }) => {
    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText('GET kbn:/api/spaces/space');
    await pageObjects.console.sendRequest();

    await expect(pageObjects.console.outputEditorContent).toContainText('"name": "Default"');
  });

  test('sends a request with query params', async ({ pageObjects }) => {
    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText('GET _cat/aliases?format=json&v=true&pretty=true');
    await pageObjects.console.sendRequest();

    expect(await pageObjects.console.getResponseStatus()).toBe(200);
  });

  test('prefixes each response of a multi-request run with its input line number', async ({
    pageObjects,
  }) => {
    const indexName = multiRequestIndexName(test.info().workerIndex);

    await pageObjects.console.clearEditorText();
    // The leading newline keeps the requests on lines 2 and 3, which is what the
    // response comments report.
    await pageObjects.console.enterText(`\nPUT ${indexName}\nDELETE ${indexName}`);
    await pageObjects.console.selectAllRequests();
    await pageObjects.console.sendRequest();

    await expect(pageObjects.console.outputEditorContent).toContainText(
      `# 2: PUT ${indexName} [200 OK]`
    );
    await expect(pageObjects.console.outputEditorContent).toContainText(
      `# 3: DELETE ${indexName} [200 OK]`
    );
  });

  test('reports the line number of each repeated request in the output', async ({
    pageObjects,
  }) => {
    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText('\nGET /_search?pretty\nGET /_search?pretty');
    await pageObjects.console.selectAllRequests();
    await pageObjects.console.sendRequest();

    await expect(pageObjects.console.outputEditorContent).toContainText(
      '# 2: GET /_search?pretty [200 OK]'
    );
    // The second response starts below the fold of the output panel, and Monaco only
    // renders the lines in the viewport, so bring it into view before asserting on it.
    await pageObjects.console.scrollOutputToBottom();
    await expect(pageObjects.console.outputEditorContent).toContainText(
      '# 3: GET /_search?pretty [200 OK]'
    );
  });

  test('clears the console output', async ({ pageObjects }) => {
    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText('GET /_search?pretty');
    await pageObjects.console.sendRequest();
    await expect(pageObjects.console.outputEditorContent).toContainText('"successful"');

    await pageObjects.console.clickClearOutput();

    await expect(pageObjects.console.outputPanelEmptyState).toBeVisible();
  });

  test('keeps the actions menu reachable when the first request line is off screen', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText(`PUT _ingest/pipeline/testme
        {
          "processors": [
            {
              "inference": {
                "model_id": "azure_openai_embeddings",
                "input_output": {
                  "input_field": "body_content",
                  "output_field": "body_content_vector"
                },
                "if": "ctx?.body_content!=null",
                "ignore_failure": true,
                 "on_failure": [
                  {
                    "append": {
                      "field": "_source._ingest.inference_errors",
                      "allow_duplicates": false,
                      "value": [
                        {
                          "message": "...",
                          "pipeline": "ml-inference-search-edf-azureopenai-embeddings",
                          "timestamp": "{{{ _ingest.timestamp }}}"
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
      }`);

    // Shrink the window so the first line of the request scrolls out of the viewport.
    await page.setViewportSize({ width: 1300, height: 500 });

    await expect(pageObjects.console.sendRequestButton).toBeVisible();
  });

  test('shows OK when the response is a 200 with an empty body', async ({ pageObjects }) => {
    await pageObjects.console.clearEditorText();
    // `HEAD /` always answers 200 with no body, and mutates nothing.
    await pageObjects.console.enterText('HEAD /');
    await pageObjects.console.sendRequest();

    await expect(pageObjects.console.outputEditorContent).toContainText('OK');
  });

  test('shows the error body when the request fails', async ({ pageObjects }) => {
    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText(
      'POST kbn:/api/alerting/rule/3603c386-9102-4c74-800d-2242e52bec98\n' +
        '{\n' +
        '  "name": "Alert on status change",\n' +
        '  "rule_type_id": ".es-querya"\n' +
        '}'
    );
    await pageObjects.console.sendRequest();

    await expect(pageObjects.console.outputEditorContent).toContainText('"statusCode": 400');
  });
});
