/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CSSProperties, Dispatch } from 'react';
import { debounce } from 'lodash';
import {
  ConsoleParsedRequestsProvider,
  getParsedRequestsProvider,
  monaco,
  ParsedRequest,
} from '@kbn/monaco';
import { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import type { HttpSetup } from '@kbn/core-http-browser';
import { DEFAULT_VARIABLES } from '../../../../../common/constants';
import { getStorage, StorageKeys } from '../../../../services';
import { sendRequest } from '../../../hooks/use_send_current_request/send_request';
import { MetricsTracker } from '../../../../types';
import { Actions } from '../../../stores/request';
import {
  stringifyRequest,
  replaceRequestVariables,
  getCurlRequest,
  trackSentRequests,
} from './utils';

export interface EditorRequest {
  method: string;
  url: string;
  data: string[];
}
const selectedRequestsClass = 'console__monaco_editor__selectedRequests';
export class MonacoEditorActionsProvider {
  private parsedRequestsProvider: ConsoleParsedRequestsProvider;
  private decorations: monaco.editor.IEditorDecorationsCollection;
  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    private setEditorActionsCss: (css: CSSProperties) => void
  ) {
    this.parsedRequestsProvider = getParsedRequestsProvider(this.editor.getModel());
    this.decorations = this.editor.createDecorationsCollection();
    this.editor.focus();
    const debouncedHighlight = debounce(() => this.highlightCurrentRequests(), 200, {
      leading: true,
    });
    debouncedHighlight();
    editor.onDidChangeCursorPosition(async (event) => {
      await debouncedHighlight();
    });
    editor.onDidScrollChange(async (event) => {
      await debouncedHighlight();
    });
    editor.onDidChangeCursorSelection(async (event) => {
      await debouncedHighlight();
    });
    editor.onDidContentSizeChange(async (event) => {
      await debouncedHighlight();
    });
  }

  private updateEditorActionsPosition(lineNumber?: number) {
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
        top: offset,
      });
    }
  }

  private async highlightCurrentRequests(): Promise<void> {
    // get the requests in the selected range
    const { range: selectedRange, parsedRequests } = await this.getSelectedParsedRequestsAndRange();
    // if any requests are selected, highlight the lines and update the position of actions buttons
    if (parsedRequests.length > 0) {
      const selectedRequestStartLine = selectedRange.startLineNumber;
      this.updateEditorActionsPosition(selectedRequestStartLine);
      this.decorations.set([
        {
          range: selectedRange,
          options: {
            isWholeLine: true,
            className: selectedRequestsClass,
          },
        },
      ]);
    } else {
      // if no requests are selected, hide actions buttons and remove highlighted lines
      this.updateEditorActionsPosition();
      this.decorations.clear();
    }
  }

  private async getSelectedParsedRequestsAndRange(): Promise<{
    parsedRequests: ParsedRequest[];
    range: monaco.IRange;
  }> {
    const model = this.editor.getModel();
    const selection = this.editor.getSelection();
    if (!model || !selection) {
      return Promise.resolve({
        parsedRequests: [],
        range: selection ?? new monaco.Range(1, 1, 1, 1),
      });
    }
    const { startLineNumber, endLineNumber } = selection;
    const parsedRequests = await this.parsedRequestsProvider.getRequests();
    const selectedRequests = [];
    let selectionStartLine = startLineNumber;
    let selectionEndLine = endLineNumber;
    for (const parsedRequest of parsedRequests) {
      const { startOffset: requestStart, endOffset: requestEnd } = parsedRequest;
      const { lineNumber: requestStartLine } = model.getPositionAt(requestStart);
      let { lineNumber: requestEndLine } = model.getPositionAt(requestEnd);
      const requestEndLineContent = model.getLineContent(requestEndLine);

      if (requestEndLineContent.trim().length < 1) {
        requestEndLine = requestEndLine - 1;
      }
      if (requestStartLine > endLineNumber) {
        // request is past the selection, no need to check further requests
        break;
      }
      if (requestEndLine < startLineNumber) {
        // request is before the selection, do nothing
      } else {
        // request is selected
        selectedRequests.push(parsedRequest);
        // expand the start of the selection to the request start
        if (selectionStartLine > requestStartLine) {
          selectionStartLine = requestStartLine;
        }
        // expand the end of the selection to the request end
        if (selectionEndLine < requestEndLine) {
          selectionEndLine = requestEndLine;
        }
      }
    }
    return {
      parsedRequests: selectedRequests,
      range: new monaco.Range(
        selectionStartLine,
        1,
        selectionEndLine,
        model.getLineMaxColumn(selectionEndLine)
      ),
    };
  }

  private async getRequests() {
    const { parsedRequests } = await this.getSelectedParsedRequestsAndRange();
    const stringifiedRequests = parsedRequests.map((parsedRequest) =>
      stringifyRequest(parsedRequest)
    );
    // get variables values
    const variables = getStorage().get(StorageKeys.VARIABLES, DEFAULT_VARIABLES);
    return stringifiedRequests.map((request) => replaceRequestVariables(request, variables));
  }

  public async getCurl(elasticsearchBaseUrl: string): Promise<string> {
    const requests = await this.getRequests();
    const curlRequests = requests.map((request) => getCurlRequest(request, elasticsearchBaseUrl));
    return curlRequests.join('\n');
  }

  public async sendRequests(
    toasts: IToasts,
    dispatch: Dispatch<Actions>,
    trackUiMetric: MetricsTracker,
    http: HttpSetup
  ): Promise<void> {
    try {
      const requests = await this.getRequests();
      if (!requests.length) {
        toasts.add(
          i18n.translate('console.notification.error.noRequestSelectedTitle', {
            defaultMessage:
              'No request selected. Select a request by placing the cursor inside it.',
          })
        );
        return;
      }

      dispatch({ type: 'sendRequest', payload: undefined });

      // track the requests
      setTimeout(() => trackSentRequests(requests, trackUiMetric), 0);

      const results = await sendRequest({ http, requests });

      // TODO save to history
      // TODO restart autocomplete polling
      dispatch({
        type: 'requestSuccess',
        payload: {
          data: results,
        },
      });
    } catch (e) {
      if (e?.response) {
        dispatch({
          type: 'requestFail',
          payload: e,
        });
      } else {
        dispatch({
          type: 'requestFail',
          payload: undefined,
        });
        toasts.addError(e, {
          title: i18n.translate('console.notification.error.unknownErrorTitle', {
            defaultMessage: 'Unknown Request Error',
          }),
        });
      }
    }
  }
}
