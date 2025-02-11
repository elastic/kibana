/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CSSProperties } from 'react';
import { debounce } from 'lodash';
import { monaco } from '@kbn/monaco';
import { createOutputParser } from '@kbn/monaco/src/console/output_parser';

import {
  getRequestEndLineNumber,
  getRequestStartLineNumber,
  SELECTED_REQUESTS_CLASSNAME,
} from './utils';

import type { AdjustedParsedRequest } from './types';

const DEBOUNCE_HIGHLIGHT_WAIT_MS = 200;
const OFFSET_EDITOR_ACTIONS = 1;

export class MonacoEditorOutputActionsProvider {
  private highlightedLines: monaco.editor.IEditorDecorationsCollection;
  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    private setEditorActionsCss: (css: CSSProperties) => void
  ) {
    this.highlightedLines = this.editor.createDecorationsCollection();

    const debouncedHighlightRequests = debounce(
      async () => {
        if (editor.hasTextFocus()) {
          await this.highlightRequests();
        } else {
          this.clearEditorDecorations();
        }
      },
      DEBOUNCE_HIGHLIGHT_WAIT_MS,
      {
        leading: true,
      }
    );

    // init all listeners
    editor.onDidChangeCursorPosition(async () => {
      await debouncedHighlightRequests();
    });
    editor.onDidScrollChange(async () => {
      await debouncedHighlightRequests();
    });
    editor.onDidChangeCursorSelection(async () => {
      await debouncedHighlightRequests();
    });
    editor.onDidContentSizeChange(async () => {
      await debouncedHighlightRequests();
    });

    editor.onDidBlurEditorText(() => {
      // Since the actions buttons are placed outside of the editor, we need to delay
      // the clearing of the editor decorations to ensure that the actions buttons
      // are not hidden.
      setTimeout(() => {
        this.clearEditorDecorations();
      }, 100);
    });
  }

  private clearEditorDecorations() {
    // remove the highlighted lines
    this.highlightedLines.clear();
    // hide action buttons
    this.setEditorActionsCss({
      visibility: 'hidden',
    });
  }

  private updateEditorActions(lineNumber?: number) {
    // if no request is currently selected, hide the actions buttons
    if (!lineNumber) {
      this.setEditorActionsCss({
        visibility: 'hidden',
      });
    } else {
      // if a request is selected, the actions buttons are placed at lineNumberOffset - scrollOffset
      const offset = this.editor.getTopForLineNumber(lineNumber) - this.editor.getScrollTop();
      this.setEditorActionsCss({
        visibility: 'visible',
        // Add a little bit of padding to the top of the actions buttons so that
        // it doesnt overlap with the selected request delimiter
        top: offset + OFFSET_EDITOR_ACTIONS,
      });
    }
  }

  private async highlightRequests(): Promise<void> {
    // get the requests in the selected range
    const parsedRequests = await this.getSelectedParsedOutput();
    // if any requests are selected, highlight the lines and update the position of actions buttons
    if (parsedRequests.length > 0) {
      // display the actions buttons on the 1st line of the 1st selected request
      const selectionStartLineNumber = parsedRequests[0].startLineNumber;
      this.updateEditorActions(selectionStartLineNumber); // highlight the lines from the 1st line of the first selected request
      // to the last line of the last selected request
      const selectionEndLineNumber = parsedRequests[parsedRequests.length - 1].endLineNumber;
      const selectedRange = new monaco.Range(
        selectionStartLineNumber,
        1,
        selectionEndLineNumber,
        this.editor.getModel()?.getLineMaxColumn(selectionEndLineNumber) ?? 1
      );
      this.highlightedLines.set([
        {
          range: selectedRange,
          options: {
            isWholeLine: true,
            blockClassName: SELECTED_REQUESTS_CLASSNAME,
          },
        },
      ]);
    } else {
      // if no requests are selected, hide actions buttons and remove highlighted lines
      this.updateEditorActions();
      this.highlightedLines.clear();
    }
  }

  private async getSelectedParsedOutput(): Promise<AdjustedParsedRequest[]> {
    const model = this.editor.getModel();
    const selection = this.editor.getSelection();

    if (!model || !selection) {
      return Promise.resolve([]);
    }
    const { startLineNumber, endLineNumber } = selection;
    return this.getRequestsBetweenLines(model, startLineNumber, endLineNumber);
  }

  private async getRequestsBetweenLines(
    model: monaco.editor.ITextModel,
    startLineNumber: number,
    endLineNumber: number
  ): Promise<AdjustedParsedRequest[]> {
    const parser = createOutputParser();
    const parsedRequests = await parser(model.getValue(), undefined).responses;

    const selectedRequests: AdjustedParsedRequest[] = [];
    for (const [index, parsedRequest] of parsedRequests.entries()) {
      const requestStartLineNumber = getRequestStartLineNumber(parsedRequest, model);
      const requestEndLineNumber = getRequestEndLineNumber({
        parsedRequest,
        nextRequest: parsedRequests.at(index + 1),
        model,
        startLineNumber,
      });
      if (requestStartLineNumber > endLineNumber) {
        // request is past the selection, no need to check further requests
        break;
      }
      if (requestEndLineNumber < startLineNumber) {
        // request is before the selection, do nothing
      } else {
        // request is selected
        selectedRequests.push({
          ...parsedRequest,
          startLineNumber: requestStartLineNumber,
          endLineNumber: requestEndLineNumber,
        });
      }
    }
    return selectedRequests;
  }

  // Set the cursor to the first line of the editor
  public selectFirstLine() {
    this.editor.setSelection(new monaco.Selection(0, 0, 0, 0));
  }

  public async getParsedOutput(): Promise<string> {
    const model = this.editor.getModel();

    if (!model) {
      return '';
    }

    let selectedRequestsString = '';
    const selectedRequests = await this.getSelectedParsedOutput();

    for (const request of selectedRequests) {
      const dataString = model
        .getValueInRange({
          startLineNumber: request.startLineNumber,
          startColumn: 1,
          endLineNumber: request.endLineNumber,
          endColumn: model.getLineMaxColumn(request.endLineNumber),
        })
        .trim();

      selectedRequestsString += dataString + '\n';
    }

    return selectedRequestsString;
  }
}
