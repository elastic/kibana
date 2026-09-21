/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';
// eslint-disable-next-line @kbn/imports/no_direct_monaco_import -- We intentionally use @kbn/monaco here
import type { monaco } from '@kbn/monaco';
import type { ScoutPage } from '..';
import { expect } from '../../../ui';

declare global {
  // augment window with monaco types so we are as close to current API monaco exposes
  // as much as possible
  interface Window {
    MonacoEnvironment?: monaco.Environment;
  }
}

/**
 * Page object that wraps common interactions with the Kibana Monaco-based code editor.
 *
 * Initially the API is intentionally aligned with the FTR `MonacoEditorService`
 * (`src/platform/test/functional/services/monaco_editor.ts`).
 */
export class KibanaCodeEditorWrapper {
  public readonly editorInputLocator: Locator;

  constructor(private readonly page: ScoutPage) {
    /**
     * Formula Monaco's real keyboard input surface — Lens has no data-test-subj on the editor
     * input. Monaco 0.54+ defaults to Chrome's native EditContext API (`.native-edit-context`,
     * a focusable div) for keyboard input whenever it's available, demoting the plain
     * `<textarea>` to a `readonly`, `aria-hidden` IME/composition fallback that never receives
     * typed characters. This selector matches whichever node is the real input surface in either
     * mode: the native-edit-context div (Chrome), or the legacy editable textarea (older engines).
     *
     */
    this.editorInputLocator = this.page
      .locator('.monaco-editor .native-edit-context')
      .or(this.page.locator('.monaco-editor textarea:not([readonly])'));
  }

  /**
   * Waits until the editor inside the given container is ready to accept interactions.
   * Safe to call before reading or writing editor content.
   */
  async waitCodeEditorReady(dataTestSubjId: string): Promise<void> {
    await expect
      .poll(
        async () =>
          this.page.evaluate((id) => {
            const monacoEnv = window.MonacoEnvironment;
            const container = document.querySelector(`[data-test-subj="${id}"]`);
            const editor = monacoEnv?.monaco?.editor
              ?.getEditors?.()
              ?.find((instance: any) => container?.contains(instance.getDomNode()));
            return Boolean(editor);
          }, dataTestSubjId),
        { timeout: 10_000 }
      )
      .toBe(true);
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
        const monacoEnv = window.MonacoEnvironment;

        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }

        const values: string[] = monacoEnv.monaco.editor
          .getModels()
          .map((model) => model.getValue());

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
   * Returns the current value of the *live* Monaco editor instance mounted inside the
   * given container `data-test-subj`, resolved fresh on every call. Use this (instead of
   * a model index) when several Monaco editors are mounted at once and the index would be
   * ambiguous or unstable across mode/tab transitions.
   *
   * This deliberately resolves the model via the editor *instance* (`getEditors().find(...)`
   * by DOM containment, then `editor.getModel()`) rather than caching the model's `data-uri`.
   * Monaco only stamps `data-uri` onto the editor's DOM node once, during initial view
   * creation (see `codeEditorWidget.js`'s `_createView`) — it is never refreshed if the same
   * editor instance later has its model swapped via `editor.setModel(...)` instead of being
   * unmounted and remounted (e.g. Lens's formula editor reuses one editor instance across
   * "quick function" <-> "formula" mode switches). A `data-uri`-based lookup can then keep
   * silently resolving to a stale, no-longer-attached model — asking the live instance for
   * its current model side-steps that entirely.
   */
  async getCodeEditorValueByTestSubj(dataTestSubjId: string): Promise<string> {
    let result = '';

    await this.waitCodeEditorReady(dataTestSubjId);

    await expect(async () => {
      result = await this.page.evaluate((id) => {
        const monacoEnv = window.MonacoEnvironment;

        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }

        const container = document.querySelector(`[data-test-subj="${id}"]`);
        if (!container) {
          throw new Error(`No container found for data-test-subj "${id}"`);
        }

        const editor = monacoEnv.monaco.editor
          .getEditors?.()
          ?.find((instance: any) => container.contains(instance.getDomNode()));

        if (!editor) {
          throw new Error(`No Monaco editor instance found inside container "${id}"`);
        }

        const model = editor.getModel();
        if (!model) {
          throw new Error(`Editor inside container "${id}" has no model attached`);
        }

        return model.getValue();
      }, dataTestSubjId);
    }).toPass({ timeout: 30_000 });

    return result;
  }

  /**
   * Sets the value of the live Monaco editor instance mounted inside the given container
   * `data-test-subj` (resolved the same way as `getCodeEditorValueByTestSubj` — see there
   * for why this doesn't use `data-uri`), and verifies that the value was applied.
   */
  async setCodeEditorValueByTestSubj(dataTestSubjId: string, value: string): Promise<string> {
    await this.waitCodeEditorReady(dataTestSubjId);

    await this.page.evaluate(
      ({ id, editorValue }) => {
        const monacoEnv = window.MonacoEnvironment;

        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }

        const container = document.querySelector(`[data-test-subj="${id}"]`);

        if (!container) {
          throw new Error(`No container found for data-test-subj "${id}"`);
        }

        const editor = monacoEnv.monaco.editor
          .getEditors?.()
          ?.find((instance: any) => container.contains(instance.getDomNode()));

        if (!editor) {
          throw new Error(`No Monaco editor instance found inside container "${id}"`);
        }

        const model = editor.getModel();
        if (!model) {
          throw new Error(`Editor inside container "${id}" has no model attached`);
        }

        model.setValue(editorValue);
        editor.focus();
      },
      { id: dataTestSubjId, editorValue: value }
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
        const monacoEnv = window.MonacoEnvironment;

        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }

        const textModels = monacoEnv.monaco.editor.getModels();

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
        const monacoEnv = window.MonacoEnvironment;
        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }

        const models = monacoEnv.monaco.editor.getModels();
        if (!models.length) {
          throw new Error('No Monaco editor models found');
        }

        const model = models[modelIndex] ?? models[0];
        const editors = monacoEnv.monaco.editor.getEditors();
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
   * Types text character-by-character via Monaco's 'type' command, firing per-character model
   * change events. Use this when a test depends on incremental change listeners (e.g. live
   * autocomplete filtering as you type). For bulk content, prefer setCodeEditorValueByTestSubj.
   */
  async simulateTyping(
    testSubjId: string,
    text: string,
    options?: Partial<{
      delay: number;
    }>
  ): Promise<void> {
    await this.waitCodeEditorReady(testSubjId);
    await this.page.evaluate(
      async ({
        id,
        textToType,
        typingSimulationOptions,
      }: {
        id: string;
        textToType: string;
        typingSimulationOptions?: Partial<{
          delay: number;
        }>;
      }) => {
        const container = document.querySelector(`[data-test-subj="${id}"]`);
        const editor = window.MonacoEnvironment?.monaco?.editor
          ?.getEditors()
          ?.find((e: any) => container?.contains(e.getDomNode()));
        if (!editor) throw new Error(`Monaco editor not found for test subject: "${id}"`);
        editor.focus();
        const delay = typingSimulationOptions?.delay ?? 0;
        for (let i = 0; i < textToType.length; i++) {
          if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
          editor.trigger('keyboard', 'type', { text: textToType[i] });
        }
      },
      { id: testSubjId, textToType: text, typingSimulationOptions: options }
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
      const monacoEnv = window.MonacoEnvironment;
      if (!monacoEnv?.monaco?.editor) {
        throw new Error('MonacoEnvironment.monaco.editor is not available');
      }
      const editors = monacoEnv.monaco.editor.getEditors();
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
        const monacoEnv = window.MonacoEnvironment;
        if (!monacoEnv?.monaco?.editor) {
          throw new Error('MonacoEnvironment.monaco.editor is not available');
        }
        const editors = monacoEnv.monaco.editor.getEditors();
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
      const monacoEnv = window.MonacoEnvironment;
      if (!monacoEnv?.monaco?.editor) {
        throw new Error('MonacoEnvironment.monaco.editor is not available');
      }
      const editors = monacoEnv.monaco.editor.getEditors();
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

  /**
   * Monaco also renders a separate glyph-margin hover widget
   * (`widgetid="editor.contrib.modesGlyphHoverWidget"`) alongside the content hover widget,
   * normally hidden but still matching `.monaco-hover`,
   * so we provide an aaffordance to select the hover popover of interest
   */
  private getHoverPopover(matchGlyphHoverWidget?: boolean): Locator {
    if (matchGlyphHoverWidget) {
      return this.page.locator('.monaco-hover[widgetid="editor.contrib.modesGlyphHoverWidget"]');
    }

    return this.page.locator(
      '.monaco-hover:not([widgetid="editor.contrib.modesGlyphHoverWidget"])'
    );
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
