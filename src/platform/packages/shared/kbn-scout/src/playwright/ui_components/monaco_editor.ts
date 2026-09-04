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
import { expect } from '../../../ui';

/**
 * Minimal description of a Monaco text model used inside `page.evaluate` callbacks.
 * Interfaces are TypeScript-only and are erased at compile time, so these are safe
 * to reference from stringified evaluate functions.
 */
interface MonacoModel {
  getValue(): string;
  setValue(value: string): void;
  getPositionAt(offset: number): unknown;
  uri: { toString(): string };
}

/** Minimal description of a Monaco editor instance used inside `page.evaluate` callbacks. */
interface MonacoEditorInstance {
  getModel(): { uri: { toString(): string } } | null;
  setPosition(pos: unknown): void;
  focus(): void;
  trigger(source: string, handlerId: string, payload: unknown): void;
  setScrollTop(scrollTop: number): void;
  getScrollTop(): number;
}

/**
 * Page object that wraps common interactions with the Kibana Monaco-based code editor.
 *
 * Initially the API is intentionally aligned with the FTR `MonacoEditorService`
 * (`src/platform/test/functional/services/monaco_editor.ts`).
 */
export class KibanaCodeEditorWrapper {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Waits for the Monaco textarea inside the container (visible + enabled), like FTR
   * `waitCodeEditorReady`.
   */
  async waitCodeEditorReady(dataTestSubjId: string): Promise<void> {
    const editor = this.page.getByTestId(dataTestSubjId).getByTestId('kibanaCodeEditor');
    await expect(editor).toBeVisible();
  }

  getCodeEditorContent(dataTestSubjId: string = 'ESQLEditor'): Locator {
    return this.page.getByTestId(dataTestSubjId).locator('.view-lines');
  }

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
    let result = '';

    await expect(async () => {
      result = await this.page.evaluate((index) => {
        const monacoEnv = (window as any).MonacoEnvironment;

        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }

        const values: string[] = (monacoEnv.monaco.editor.getModels() as MonacoModel[]).map(
          (model) => model.getValue()
        );

        if (!values.length) {
          return '';
        }

        if (index >= 0 && index < values.length) {
          return values[index]!;
        }

        // Fallback to the first model value if the requested index is out of range
        return values[0]!;
      }, nthIndex);
    }).toPass({ timeout: 30_000 });

    return result;
  }

  /**
   * Resolves the `data-uri` Monaco sets on the editor root, scoped to the given
   * container `data-test-subj`. Use this (instead of a model index) when several
   * Monaco editors are mounted at once and the index would be ambiguous or unstable
   * across mode/tab transitions.
   */
  private async getEditorUriByTestSubj(dataTestSubjId: string): Promise<string> {
    const uri = await this.page
      .getByTestId(dataTestSubjId)
      .locator('.monaco-editor[data-uri]')
      .getAttribute('data-uri');
    if (!uri) {
      throw new Error(`Editor data-uri not found for container "${dataTestSubjId}"`);
    }
    return uri;
  }

  /**
   * Returns the current value of the Monaco editor model inside the given
   * container `data-test-subj`, resolved by the model's `data-uri` rather than
   * a global index.
   */
  async getCodeEditorValueByTestSubj(dataTestSubjId: string): Promise<string> {
    let result = '';

    await expect(async () => {
      const uri = await this.getEditorUriByTestSubj(dataTestSubjId);
      result = await this.page.evaluate((modelUri) => {
        const monacoEnv = (window as any).MonacoEnvironment;

        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }

        const model = (monacoEnv.monaco.editor.getModel(modelUri) as MonacoModel | null) ?? null;
        if (!model) {
          throw new Error(`No Monaco editor model found for uri "${modelUri}"`);
        }

        return model.getValue();
      }, uri);
    }).toPass({ timeout: 30_000 });

    return result;
  }

  /**
   * Sets the value of the Monaco editor model inside the given container
   * `data-test-subj`, resolved by the model's `data-uri` rather than a global
   * index, and verifies that the value was applied.
   */
  async setCodeEditorValueByTestSubj(dataTestSubjId: string, value: string): Promise<string> {
    const uri = await this.getEditorUriByTestSubj(dataTestSubjId);
    await this.page.evaluate(
      ({ modelUri, editorValue }) => {
        const monacoEnv = (window as any).MonacoEnvironment;

        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }

        const model = (monacoEnv.monaco.editor.getModel(modelUri) as MonacoModel | null) ?? null;
        if (!model) {
          throw new Error(`No Monaco editor model found for uri "${modelUri}"`);
        }

        model.setValue(editorValue);
      },
      { modelUri: uri, editorValue: value }
    );

    return await this.getCodeEditorValueByTestSubj(dataTestSubjId);
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

        const textModels = monacoEnv.monaco.editor.getModels() as MonacoModel[];

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

  /**
   * Returns a locator for the Monaco suggestion detail panel (the documentation pop-up
   * displayed alongside the autocomplete suggestion list).
   *
   * The detail panel has no `data-test-subj`. Monaco renders it as an *overlay widget*
   * (via `addOverlayWidget`) which is placed inside the main `.monaco-editor` element,
   * NOT inside the overflow-widgets container (which only holds content widgets).
   */
  public getSuggestDetailsContainer() {
    return this.page.locator('.suggest-details-container');
  }

  /**
   * Positions the cursor after the given `text` in the editor model (if provided),
   * then programmatically triggers the Monaco autocomplete suggestion list.
   *
   * @param text - Optional substring to position the cursor after before triggering.
   *   When omitted the cursor stays at its current position.
   * @param nthIndex - Index of the Monaco text model to use. Defaults to `0`.
   */
  async triggerSuggest(text?: string, nthIndex: number = 0): Promise<void> {
    await this.page.evaluate(
      ({ searchText, modelIndex }) => {
        const monacoEnv = (window as any).MonacoEnvironment;
        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }

        const models = monacoEnv.monaco.editor.getModels() as MonacoModel[];
        if (!models.length) {
          throw new Error('No Monaco editor models found');
        }

        const model = models[modelIndex] ?? models[0];
        const editors = monacoEnv.monaco.editor.getEditors() as MonacoEditorInstance[];
        const editorInstance =
          editors.find((e) => e.getModel()?.uri?.toString() === model.uri.toString()) ?? editors[0];

        if (!editorInstance) {
          throw new Error('No Monaco editor instance found');
        }

        if (searchText !== undefined) {
          const content: string = model.getValue();
          const offset = content.indexOf(searchText);
          if (offset === -1) {
            throw new Error(`Text "${searchText}" not found in editor`);
          }
          const position = model.getPositionAt(offset + searchText.length);
          editorInstance.setPosition(position);
        }

        editorInstance.focus();
        editorInstance.trigger('scout-test', 'editor.action.triggerSuggest', {});
      },
      { searchText: text, modelIndex: nthIndex }
    );
  }

  /**
   * Toggles the Monaco suggestion detail panel (the documentation pop-up displayed
   * alongside the autocomplete suggestion list) for the given editor instance.
   *
   * The precondition `HasFocusedSuggestion` must already be satisfied — call
   * `triggerSuggest()` and navigate to an item with `ArrowDown` before calling this.
   *
   * @param editorIndex - Index of the editor instance to target. Defaults to `0`.
   */
  async toggleSuggestDetails(editorIndex: number = 0): Promise<void> {
    await this.page.evaluate((index) => {
      const monacoEnv = (window as any).MonacoEnvironment;
      if (!monacoEnv?.monaco?.editor) {
        throw new Error('MonacoEnvironment.monaco.editor is not available');
      }
      const editors = monacoEnv.monaco.editor.getEditors() as MonacoEditorInstance[];
      const editor = editors[index] ?? editors[0];
      if (!editor) {
        throw new Error('No Monaco editor instance found');
      }
      editor.trigger('scout-test', 'toggleSuggestionDetails', {});
    }, editorIndex);
  }

  async setScrollTop(scrollTop: number, editorIndex: number = 0): Promise<void> {
    await this.page.evaluate(
      ({ index, scrollAmount }) => {
        const monacoEnv = (window as any).MonacoEnvironment;
        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }
        const editors = monacoEnv.monaco.editor.getEditors() as MonacoEditorInstance[];
        const editor = editors[index] ?? editors[0];
        if (!editor) {
          throw new Error('No Monaco editor instance found');
        }
        editor.setScrollTop(scrollAmount);
      },
      { index: editorIndex, scrollAmount: scrollTop }
    );
  }

  async getScrollTop(editorIndex: number = 0): Promise<number> {
    return this.page.evaluate((index) => {
      const monacoEnv = (window as any).MonacoEnvironment;
      if (!monacoEnv?.monaco?.editor) {
        throw new Error('MonacoEnvironment.monaco.editor is not available');
      }
      const editors = monacoEnv.monaco.editor.getEditors() as MonacoEditorInstance[];
      return editors[index]?.getScrollTop() ?? editors[0]?.getScrollTop() ?? 0;
    }, editorIndex);
  }

  /**
   * Locator for a Monaco *inline decoration* rendered via `inlineClassName`
   * (e.g. the ES|QL editor's lookup-join badges). These are plain `<span>`s
   * injected by Monaco's decoration API, not React elements, so they can't
   * carry a `data-test-subj` — a CSS class is the correct way to target them.
   */
  getDecoration(decorationClassName: string): Locator {
    return this.page.locator(`.${decorationClassName}`);
  }

  private getHoverPopover(): Locator {
    return this.page.locator('.monaco-hover');
  }

  /**
   * Hovers a Monaco inline decoration (see {@link getDecoration}) and returns
   * the text of its `hoverMessage` tooltip once the popover has rendered.
   */
  async getDecorationHoverText(decorationClassName: string): Promise<string> {
    // Reset the pointer first so a stale hover from a previous action doesn't
    // mask the popover this call is waiting for.
    await this.page.mouse.move(0, 0);
    await this.getDecoration(decorationClassName).hover();

    const hover = this.getHoverPopover();
    await hover.waitFor({ state: 'visible' });
    const rows = hover.locator('.hover-row');
    await rows.waitFor({ state: 'visible' });

    const texts = await rows.allInnerTexts();
    return texts.join(' ').trim();
  }

  /**
   * Hovers a Monaco inline decoration and clicks the hover-popover row whose
   * text contains `optionText` (e.g. an "Edit lookup index" action link).
   */
  async selectDecorationHoverOption(
    decorationClassName: string,
    optionText: string
  ): Promise<void> {
    await this.page.mouse.move(0, 0);
    await this.getDecoration(decorationClassName).hover();

    const hover = this.getHoverPopover();
    await hover.waitFor({ state: 'visible' });
    const option = hover.locator('.hover-row', { hasText: optionText });
    await option.waitFor({ state: 'visible' });
    await option.click();
  }
}
