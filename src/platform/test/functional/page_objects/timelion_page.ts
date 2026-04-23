/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

export class TimelionPageObject extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly monacoEditor = this.ctx.getService('monacoEditor');

  public async getSuggestionItemsText() {
    let lists: WebElementWrapper[] = [];
    await this.retry.try(async () => {
      const editorSuggestions = await this.monacoEditor.getCodeEditorSuggestWidget();
      lists = await editorSuggestions.findAllByClassName('monaco-list-row');
      if (lists.length === 0) {
        throw new Error('suggestion list not populated');
      }
    });
    return await Promise.all(lists.map(async (element) => await element.getVisibleText()));
  }

  public async clickSuggestion(suggestionIndex = 0) {
    const editorSuggestions = await this.monacoEditor.getCodeEditorSuggestWidget();
    const lists = await editorSuggestions.findAllByCssSelector('.monaco-list-row');
    if (suggestionIndex > lists.length) {
      throw new Error(
        `Unable to select suggestion ${suggestionIndex}, only ${lists.length} suggestions available.`
      );
    }
    await lists[suggestionIndex].click();
  }
}
