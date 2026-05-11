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

test.describe(
  'Content Management Examples - Todo App',
  { tag: ['@local-stateful-classic'] },
  () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsViewer();
      await page.gotoApp('contentManagementExamples');
      await expect(page.testSubj.locator('todosExample')).toBeVisible();
    });

    test('Todo app CRUD operations work', async ({ page }) => {
      const todoItems = page.locator('[data-test-subj~="todoItem"]');

      // Verify initial state: 2 todos
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
      await newTodo.click();
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
  }
);
