/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

test.describe('Content Management Examples', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.sampleData.install('flights');
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.sampleData.remove('flights');
  });

  test('Todo app CRUD operations work', async ({ browserAuth, page }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('contentManagementExamples');
    await expect(page.testSubj.locator('todosExample')).toBeVisible();

    const todoItems = page.locator('[data-test-subj~="todoItem"]');

    await expect(todoItems).toHaveCount(2);

    // Filter by "Completed" — expect 1 item
    await page.getByRole('button', { name: 'Completed' }).click();
    await expect(page.testSubj.locator('todoPending')).toHaveCount(0);
    await expect(todoItems).toHaveCount(1);

    // Filter by "Todo" — expect 1 item
    await page.getByRole('button', { name: 'Todo' }).click();
    await expect(page.testSubj.locator('todoPending')).toHaveCount(0);
    await expect(todoItems).toHaveCount(1);

    // Filter by "All" — expect 2 items
    await page.getByRole('button', { name: 'All' }).click();
    await expect(page.testSubj.locator('todoPending')).toHaveCount(0);
    await expect(todoItems).toHaveCount(2);

    // Add a new todo
    const newTodoInput = page.testSubj.locator('newTodo');
    await newTodoInput.fill('New todo');
    await newTodoInput.press('Enter');
    await expect(page.testSubj.locator('todoPending')).toHaveCount(0);
    await expect(todoItems).toHaveCount(3);

    // Verify new todo text and checkbox state
    const newTodo = todoItems.filter({ hasText: 'New todo' });
    await expect(newTodo).toBeVisible();
    const newTodoCheckbox = newTodo.locator('[data-test-subj~="todoCheckbox"]');
    await expect(newTodoCheckbox).not.toBeChecked();

    // Toggle the new todo to completed
    await newTodo.locator('label').click();
    await expect(page.testSubj.locator('todoPending')).toHaveCount(0);

    // Verify it appears under "Completed" filter
    await page.getByRole('button', { name: 'Completed' }).click();
    await expect(page.testSubj.locator('todoPending')).toHaveCount(0);
    await expect(todoItems).toHaveCount(2);
    const completedNewTodo = todoItems.filter({ hasText: 'New todo' });
    await expect(completedNewTodo).toBeVisible();
    const completedCheckbox = completedNewTodo.locator('[data-test-subj~="todoCheckbox"]');
    await expect(completedCheckbox).toBeChecked();

    // Delete the new todo
    await completedNewTodo.getByLabel('Delete').click();
    await expect(page.testSubj.locator('todoPending')).toHaveCount(0);
    await expect(todoItems).toHaveCount(1);
  });

  test('MSearch demo displays sample flights data', async ({
    browserAuth,
    page,
    pageObjects,
    kbnUrl,
  }) => {
    await browserAuth.loginAsViewer();
    await page.goto(kbnUrl.get('/app/contentManagementExamples/msearch'));

    await expect(page.testSubj.locator('msearchExample')).toBeVisible();
    await pageObjects.listingTable.waitUntilTableIsLoaded();

    const expectedItems = [
      'kibana_sample_data_flights',
      '[Flights] Airport Connections (Hover Over Airport)',
      '[Flights] Departures Count Map',
      '[Flights] Origin Time Delayed',
      '[Flights] Flight Log',
    ];

    await expect
      .poll(() => pageObjects.listingTable.getAllItemsNames())
      .toEqual(expect.arrayContaining(expectedItems));
  });

  test('Finder demo displays saved objects from sample data', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginAsViewer();
    await page.goto(kbnUrl.get('/app/contentManagementExamples/finder'));

    await expect(page.testSubj.locator('finderExample')).toBeVisible();
    await expect(page.testSubj.locator('savedObjectsFinderTable')).toBeVisible();

    const titleElements = page.testSubj.locator('savedObjectFinderTitle');
    await expect(titleElements.first()).toBeVisible();

    const titles = await titleElements.locator('.euiLink').allTextContents();

    const expectedItems = [
      'Kibana Sample Data Flights',
      '[Flights] Airport Connections (Hover Over Airport)',
      '[Flights] Departures Count Map',
      '[Flights] Origin Time Delayed',
      '[Flights] Flight Log',
    ];

    for (const item of expectedItems) {
      expect(titles).toContain(item);
    }
  });
});
