/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
// Defined inline to avoid importing @kbn/code-editor which loads browser globals (Node.js incompatible).
// Must stay in sync with KBN_A11Y_HANDLE_ESCAPE_ACTION_ID in @kbn/code-editor/src/code_editor.tsx.
const KBN_A11Y_HANDLE_ESCAPE_ACTION_ID = 'kbn.a11y.handleEscape' as const;
import { FtrService } from '../ftr_provider_context';

export class MonacoEditorService extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly findService = this.ctx.getService('find');

  public async waitCodeEditorReady(containerTestSubjId: string): Promise<WebElementWrapper> {
    const editorContainer = await this.testSubjects.find(containerTestSubjId);
    await this.retry.waitFor('editor enabled', async () => {
      return await this.browser.execute((id: string) => {
        const container = document.querySelector(`[data-test-subj="${id}"]`);
        const editor = window.MonacoEnvironment?.monaco?.editor
          ?.getEditors()
          ?.find((e: any) => container?.contains(e.getDomNode()));
        return !!editor;
      }, containerTestSubjId);
    });
    return editorContainer.findByCssSelector('textarea');
  }

  public async getCodeEditorValue(nthIndex: number = 0) {
    let values: string[] = [];

    await this.retry.try(async () => {
      values = await this.browser.execute(
        () =>
          // The monaco property is guaranteed to exist as it's value is provided in @kbn/monaco for this specific purpose, see {@link src/platform/packages/shared/kbn-monaco/src/register_globals.ts}
          window
            .MonacoEnvironment!.monaco.editor.getModels()
            .map((model: any) => model.getValue()) as string[]
      );
    });

    return values[nthIndex] as string;
  }

  /**
   * Replaces the entire editor content and moves the cursor to the end.
   * @param triggerSuggest - Whether to trigger autocomplete after setting the value (default: true).
   *   Pass false for setup/context text where you don't want completions to fire.
   */
  public async typeCodeEditorValue(value: string, testSubjId: string, triggerSuggest = true) {
    await this.waitCodeEditorReady(testSubjId);
    await this.browser.execute(
      (id: string, text: string, suggest: boolean) => {
        const container = document.querySelector(`[data-test-subj="${id}"]`);
        const editor = window
          .MonacoEnvironment!.monaco.editor.getEditors()
          .find((e: any) => container?.contains(e.getDomNode()));
        if (!editor) return;
        editor.focus();
        editor.getModel()?.setValue(text);
        const model = editor.getModel();
        if (model) {
          const lastLine = model.getLineCount();
          editor.setPosition({
            lineNumber: lastLine,
            column: model.getLineMaxColumn(lastLine),
          });
        }
        if (suggest) {
          editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
        }
      },
      testSubjId,
      value,
      triggerSuggest
    );
  }

  /**
   * Append text to an existing editor value (atomic operation, no interleaving).
   */
  public async appendToCodeEditor(testSubjId: string, text: string) {
    await this.browser.execute(
      (id: string, textToAppend: string) => {
        const container = document.querySelector(`[data-test-subj="${id}"]`);
        const editor = window.MonacoEnvironment?.monaco?.editor
          ?.getEditors()
          ?.find((e: any) => container?.contains(e.getDomNode()));
        const model = editor?.getModel();
        if (!editor || !model) return;

        model.setValue(model.getValue() + textToAppend);
        const lastLine = model.getLineCount();
        editor.setPosition({ lineNumber: lastLine, column: model.getLineMaxColumn(lastLine) });
        editor.focus();
      },
      testSubjId,
      text
    );
  }

  public async setCodeEditorValue(value: string, nthIndex?: number) {
    await this.retry.try(async () => {
      await this.browser.execute(
        (editorIndex, codeEditorValue) => {
          // The monaco property is guaranteed to exist as it's value is provided in @kbn/monaco for this specific purpose, see {@link src/platform/packages/shared/kbn-monaco/src/register_globals.ts}
          const editor = window.MonacoEnvironment!.monaco.editor;
          const textModels = editor.getModels();

          if (editorIndex !== undefined && textModels[editorIndex]) {
            textModels[editorIndex].setValue(codeEditorValue);
          } else {
            // when specific model instance is unknown, update all models returned
            textModels.forEach((model) => model.setValue(codeEditorValue));
          }
        },
        nthIndex,
        value
      );
      const newCodeEditorValue = await this.getCodeEditorValue(nthIndex);
      expect(newCodeEditorValue).equal(
        value,
        `Expected value was: ${value}, but got: ${newCodeEditorValue}`
      );
    });
  }

  public async getCurrentMarkers(testSubjId: string) {
    return this.findService.allByCssSelector(
      `[data-test-subj="${testSubjId}"] .cdr.squiggly-error`
    );
  }

  public async clearCodeEditorValue(testSubjId: string) {
    await this.browser.execute((id: string) => {
      const container = document.querySelector(`[data-test-subj="${id}"]`);
      const editor = window
        .MonacoEnvironment!.monaco.editor.getEditors()
        .find((e: any) => container?.contains(e.getDomNode()));
      editor?.getModel()?.setValue('');
      editor?.focus();
    }, testSubjId);
  }

  public async getCodeEditorValueByTestSubj(testSubjId: string): Promise<string> {
    return await this.browser.execute((id: string) => {
      const container = document.querySelector(`[data-test-subj="${id}"]`);
      const editor = window
        .MonacoEnvironment!.monaco.editor.getEditors()
        .find((e: any) => container?.contains(e.getDomNode()));
      return editor?.getModel()?.getValue() ?? '';
    }, testSubjId);
  }

  public async selectAllCodeEditorValue(testSubjId: string) {
    await this.browser.execute((id: string) => {
      const container = document.querySelector(`[data-test-subj="${id}"]`);
      const editor = window
        .MonacoEnvironment!.monaco.editor.getEditors()
        .find((e: any) => container?.contains(e.getDomNode()));
      const model = editor?.getModel();
      if (editor && model) {
        const lastLine = model.getLineCount();
        const lastColumn = model.getLineMaxColumn(lastLine);
        editor.focus();
        editor.setSelection({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: lastLine,
          endColumn: lastColumn,
        });
      }
    }, testSubjId);
  }

  private async waitCodeEditorReadyByCssSelector(cssSelector: string): Promise<void> {
    await this.retry.waitFor('editor ready', async () => {
      const isReady = await this.browser.execute((selector: string) => {
        const container = document.querySelector(selector);
        const editor = window.MonacoEnvironment?.monaco?.editor
          ?.getEditors()
          ?.find((e: any) => container?.contains(e.getDomNode()));
        return !!editor;
      }, cssSelector);
      return isReady;
    });
  }

  public async setCodeEditorValueByCssSelector(cssSelector: string, value: string) {
    await this.waitCodeEditorReadyByCssSelector(cssSelector);
    await this.browser.execute(
      (selector: string, text: string) => {
        const container = document.querySelector(selector);
        const editor = window
          .MonacoEnvironment!.monaco.editor.getEditors()
          .find((e: any) => container?.contains(e.getDomNode()));
        if (editor) {
          editor.getModel()?.setValue(text);
          editor.focus();
        }
      },
      cssSelector,
      value
    );
  }

  public async clearCodeEditorValueByCssSelector(cssSelector: string) {
    await this.setCodeEditorValueByCssSelector(cssSelector, '');
  }

  public async setScrollTop(scrollTop: number, nthIndex: number = 0) {
    await this.browser.execute(
      (index: number, scroll: number) => {
        const editors = window.MonacoEnvironment!.monaco.editor.getEditors();
        if (editors[index]) {
          editors[index].setScrollTop(scroll);
        }
      },
      nthIndex,
      scrollTop
    );
  }

  public async getScrollTop(nthIndex: number = 0): Promise<number> {
    return await this.browser.execute((index: number) => {
      const editors = window.MonacoEnvironment!.monaco.editor.getEditors();
      return editors[index]?.getScrollTop() ?? 0;
    }, nthIndex);
  }

  /**
   * Types text character-by-character via Monaco's 'type' command, firing per-character model
   * change events. Use this when a test depends on incremental change listeners (e.g. live
   * validation as you type). For bulk content, prefer `appendToCodeEditor` which is faster.
   */
  public async simulateTyping(testSubjId: string, text: string) {
    await this.waitCodeEditorReady(testSubjId);
    await this.browser.execute(
      (id: string, textToType: string) => {
        const container = document.querySelector(`[data-test-subj="${id}"]`);
        const editor = window.MonacoEnvironment?.monaco?.editor
          ?.getEditors()
          ?.find((e: any) => container?.contains(e.getDomNode()));
        if (!editor) return;
        editor.focus();
        for (let i = 0; i < textToType.length; i++) {
          editor.trigger('keyboard', 'type', { text: textToType[i] });
        }
      },
      testSubjId,
      text
    );
  }

  public async simulateKeyCommand(testSubjId: string, key: string) {
    const keyToCommandId: Record<string, string> = {
      ArrowLeft: 'cursorLeft',
      ArrowRight: 'cursorRight',
      ArrowUp: 'cursorUp',
      ArrowDown: 'cursorDown',
      Escape: KBN_A11Y_HANDLE_ESCAPE_ACTION_ID,
      Enter: 'acceptSelectedSuggestion',
    };
    await this.browser.execute(
      (id: string, commandId: string) => {
        const container = document.querySelector(`[data-test-subj="${id}"]`);
        const editor = window.MonacoEnvironment?.monaco?.editor
          ?.getEditors()
          ?.find((e: any) => container?.contains(e.getDomNode()));
        if (editor) {
          editor.focus();
          editor.trigger('keyboard', commandId, {});
        }
      },
      testSubjId,
      keyToCommandId[key] ?? key
    );
  }

  public async triggerSuggest(testSubjId: string) {
    await this.browser.execute((id: string) => {
      const container = document.querySelector(`[data-test-subj="${id}"]`);
      const editor = window.MonacoEnvironment?.monaco?.editor
        ?.getEditors()
        ?.find((e: any) => container?.contains(e.getDomNode()));
      if (editor) {
        editor.focus();
        editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
      }
    }, testSubjId);
  }

  public async getCodeEditorSuggestWidget(): Promise<WebElementWrapper> {
    return this.findService.byCssSelector(
      '[data-test-subj="kbnCodeEditorEditorOverflowWidgetsContainer"] .suggest-widget'
    );
  }
}
