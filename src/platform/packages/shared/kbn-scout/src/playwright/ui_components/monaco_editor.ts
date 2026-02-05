/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';
import type { ScoutPage } from '..';

/**
 * Page object that wraps common interactions with the Kibana Monaco-based code editor.
 *
 * Initially the API is intentionally aligned with the FTR `MonacoEditorService`
 * (`src/platform/test/functional/services/monaco_editor.ts`).
 */
export class KibanaCodeEditorWrapper {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Returns the current value of the Monaco editor model at the given index.
   *
   * This uses the globally registered `window.MonacoEnvironment.monaco.editor`
   * (see `src/platform/packages/shared/kbn-monaco/src/register_globals.ts`).
   *
   * @param nthIndex - Index of the Monaco text model to read. Defaults to `0`.
   * @returns The current editor value as a string. If no models are registered,
   *   an empty string is returned.
   */
  async getCodeEditorValue(nthIndex: number = 0): Promise<string> {
    return await this.page.evaluate((index) => {
      const monacoEnv = (window as any).MonacoEnvironment;

      if (!monacoEnv?.monaco?.editor) {
        throw new Error('MonacoEnvironment.monaco.editor is not available');
      }

      const values: string[] = monacoEnv.monaco.editor
        .getModels()
        .map((model: any) => model.getValue() as string);

      if (!values.length) {
        return '';
      }

      if (index >= 0 && index < values.length) {
        return values[index]!;
      }

      // Fallback to the first model value if the requested index is out of range
      return values[0]!;
    }, nthIndex);
  }

  /**
   * Sets the value of the Monaco editor model at the given index using the
   * global `MonacoEnvironment`, and verifies that the value was applied.
   *
   * @param value - New value to set in the editor.
   * @param nthIndex - Optional index of the Monaco text model to update.
   *   When omitted, all models are updated (matching the FTR behavior).
   */
  async setCodeEditorValue(value: string, nthIndex?: number): Promise<string> {
    await this.page.evaluate(
      ({ editorIndex, codeEditorValue }) => {
        const monacoEnv = (window as any).MonacoEnvironment;

        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }

        const editor = monacoEnv.monaco.editor;
        const textModels: any[] = editor.getModels();

        if (!textModels.length) {
          throw new Error('No Monaco editor models found');
        }

        if (typeof editorIndex === 'number' && textModels[editorIndex]) {
          textModels[editorIndex].setValue(codeEditorValue);
        } else {
          // When the specific model instance is unknown, update all models
          textModels.forEach((model) => model.setValue(codeEditorValue));
        }
      },
      { editorIndex: nthIndex, codeEditorValue: value }
    );

    // Return the new value for later assertions
    return await this.getCodeEditorValue(nthIndex ?? 0);
  }

  /**
   * Returns a locator for the current Monaco error markers inside the given
   * editor container.
   *
   * This mirrors the FTR helper that finds `.cdr.squiggly-error` elements,
   * but exposes a Playwright `Locator` so callers can assert on count, text, etc.
   *
   * @param testSubjId - `data-test-subj` of the editor container.
   *   Defaults to `'kibanaCodeEditor'`.
   * @returns A Playwright `Locator` for the current error markers.
   */
  getCurrentMarkers(testSubjId: string = 'kibanaCodeEditor'): Locator {
    const selector = `[data-test-subj="${testSubjId}"] .cdr.squiggly-error`;
    return this.page.locator(selector);
  }

  public getCodeEditorSuggestWidget() {
    return this.page.locator(
      '[data-test-subj="kbnCodeEditorEditorOverflowWidgetsContainer"] .suggest-widget'
    );
  }
}
