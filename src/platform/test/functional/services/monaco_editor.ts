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
import { FtrService } from '../ftr_provider_context';

export class MonacoEditorService extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly findService = this.ctx.getService('find');

  public async waitCodeEditorReady(containerTestSubjId: string): Promise<WebElementWrapper> {
    const editorContainer = await this.testSubjects.find(containerTestSubjId);
    const editor = await editorContainer.findByCssSelector('textarea');
    // Wait for the editor to be enabled
    await this.retry.waitFor('editor enabled', async () => {
      return (await editor.isDisplayed()) && (await editor.isEnabled());
    });
    return editor;
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

  public async typeCodeEditorValue(value: string, testSubjId: string) {
    const editor = await this.testSubjects.find(testSubjId);
    const textarea = await editor.findByCssSelector('textarea');
    await textarea.type(value);
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

  public getCodeEditorSuggestWidget() {
    return this.findService.byCssSelector(
      '[data-test-subj="kbnCodeEditorEditorOverflowWidgetsContainer"] .suggest-widget'
    );
  }

  public async setScrollTop(scrollTop: number, nthIndex: number = 0) {
    await this.browser.execute(
      (editorIndex, scrollAmount) => {
        const editors = window.MonacoEnvironment?.monaco?.editor?.getEditors();
        if (editors && editors[editorIndex]) {
          editors[editorIndex].setScrollTop(scrollAmount);
        }
      },
      nthIndex,
      scrollTop
    );
  }

  public async getScrollTop(nthIndex: number = 0): Promise<number> {
    return await this.browser.execute((editorIndex) => {
      const editors = window.MonacoEnvironment?.monaco?.editor?.getEditors();
      return editors?.[editorIndex]?.getScrollTop() ?? 0;
    }, nthIndex);
  }
}
