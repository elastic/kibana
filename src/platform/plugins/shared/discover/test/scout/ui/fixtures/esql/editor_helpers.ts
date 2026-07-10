/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Small ES|QL editor helpers on top of `KibanaCodeEditorWrapper` for
 * suggestion selection and Monaco-hover badge interactions (e.g. the lookup
 * index "Create"/"Edit" badges). Plugin local: promote to `@kbn/scout` if a
 * second consumer needs these.
 */

import type { ScoutPage } from '@kbn/scout';
import type { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * Sets the ES|QL editor content, then triggers and selects a suggestion by
 * its (unique) visible label.
 */
export const selectEsqlSuggestionByLabel = async (
  codeEditor: KibanaCodeEditorWrapper,
  query: string,
  label: string
): Promise<void> => {
  await codeEditor.setCodeEditorValue(query);

  const suggestWidget = codeEditor.getCodeEditorSuggestWidget();
  const suggestionRow = suggestWidget.locator('.monaco-list-row', { hasText: label });

  // The ES|QL language server can take a moment to surface a suggestion after
  // the model is updated, so retry triggering the widget until it appears.
  await expect(async () => {
    await codeEditor.triggerSuggest(query);
    await expect(suggestionRow).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  await suggestionRow.click();
  await expect(suggestWidget).toBeHidden();
};

/**
 * Hovers the given Monaco decoration (identified by its CSS class, e.g. a
 * lookup-index badge) and returns the hover popup's text.
 */
export const getEsqlBadgeHoverText = async (
  page: ScoutPage,
  badgeClassName: string
): Promise<string> => {
  await page.mouse.move(0, 0);
  const badge = page.locator(`.${badgeClassName}`);
  // The lookup-index badge decoration is applied asynchronously (debounced
  // Monaco decoration + an ES call to check index existence/closed state), so
  // wait for it to actually attach before hovering.
  await expect(badge).toBeAttached({ timeout: 20_000 });
  await badge.hover();

  const hover = page.locator('.monaco-hover');
  await expect(hover).toBeVisible();
  const rows = hover.locator('.hover-row');

  let text = '';
  await expect
    .poll(async () => {
      text = (await rows.allInnerTexts()).join(' ').trim();
      return text;
    })
    .not.toBe('');

  return text;
};

/**
 * Hovers the given Monaco decoration and clicks a hover-popup option by its
 * visible text (e.g. "Edit lookup index").
 */
export const selectEsqlBadgeHoverOption = async (
  page: ScoutPage,
  badgeClassName: string,
  optionText: string
): Promise<void> => {
  await page.mouse.move(0, 0);
  const badge = page.locator(`.${badgeClassName}`);
  await expect(badge).toBeAttached({ timeout: 20_000 });
  await badge.hover();

  const hover = page.locator('.monaco-hover');
  await expect(hover).toBeVisible();
  const option = hover.locator('.hover-row', { hasText: optionText });
  await expect(option).toBeVisible();
  await option.click();
};
