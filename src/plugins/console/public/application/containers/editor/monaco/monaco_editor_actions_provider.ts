/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CSSProperties, Dispatch } from 'react';
import { debounce } from 'lodash';
import { ConsoleParsedRequestsProvider, getParsedRequestsProvider, monaco } from '@kbn/monaco';
import { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import type { HttpSetup } from '@kbn/core-http-browser';
import { DEFAULT_VARIABLES } from '../../../../../common/constants';
import { getStorage, StorageKeys } from '../../../../services';
import { sendRequest } from '../../../hooks';
import { MetricsTracker } from '../../../../types';
import { Actions } from '../../../stores/request';

import {
  AutocompleteType,
  containsUrlParams,
  getBodyCompletionItems,
  getCurlRequest,
  getDocumentationLinkFromAutocomplete,
  getLineTokens,
  getMethodCompletionItems,
  getRequestEndLineNumber,
  getRequestStartLineNumber,
  getUrlParamsCompletionItems,
  getUrlPathCompletionItems,
  replaceRequestVariables,
  SELECTED_REQUESTS_CLASSNAME,
  stringifyRequest,
  trackSentRequests,
} from './utils';

import type { AdjustedParsedRequest } from './types';

export class MonacoEditorActionsProvider {
  private parsedRequestsProvider: ConsoleParsedRequestsProvider;
  private highlightedLines: monaco.editor.IEditorDecorationsCollection;
  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    private setEditorActionsCss: (css: CSSProperties) => void
  ) {
    this.parsedRequestsProvider = getParsedRequestsProvider(this.editor.getModel());
    this.highlightedLines = this.editor.createDecorationsCollection();
    this.editor.focus();

    const debouncedHighlightRequests = debounce(() => this.highlightRequests(), 200, {
      leading: true,
    });
    debouncedHighlightRequests();

    // init all listeners
    editor.onDidChangeCursorPosition(async (event) => {
      await debouncedHighlightRequests();
    });
    editor.onDidScrollChange(async (event) => {
      await debouncedHighlightRequests();
    });
    editor.onDidChangeCursorSelection(async (event) => {
      await debouncedHighlightRequests();
    });
    editor.onDidContentSizeChange(async (event) => {
      await debouncedHighlightRequests();
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
        top: offset,
      });
    }
  }

  private async highlightRequests(): Promise<void> {
    // get the requests in the selected range
    const parsedRequests = await this.getSelectedParsedRequests();
    // if any requests are selected, highlight the lines and update the position of actions buttons
    if (parsedRequests.length > 0) {
      // display the actions buttons on the 1st line of the 1st selected request
      const selectionStartLineNumber = parsedRequests[0].startLineNumber;
      this.updateEditorActions(selectionStartLineNumber);
      // highlight the lines from the 1st line of the first selected request
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
            className: SELECTED_REQUESTS_CLASSNAME,
          },
        },
      ]);
    } else {
      // if no requests are selected, hide actions buttons and remove highlighted lines
      this.updateEditorActions();
      this.highlightedLines.clear();
    }
  }

  private async getSelectedParsedRequests(): Promise<AdjustedParsedRequest[]> {
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
    const parsedRequests = await this.parsedRequestsProvider.getRequests();
    const selectedRequests: AdjustedParsedRequest[] = [];
    for (const [index, parsedRequest] of parsedRequests.entries()) {
      const requestStartLineNumber = getRequestStartLineNumber(parsedRequest, model);
      const requestEndLineNumber = getRequestEndLineNumber(
        parsedRequest,
        model,
        index,
        parsedRequests
      );
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

  private async getRequests() {
    const parsedRequests = await this.getSelectedParsedRequests();
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

  public async getDocumentationLink(docLinkVersion: string): Promise<string | null> {
    const requests = await this.getRequests();
    if (requests.length < 1) {
      return null;
    }
    const request = requests[0];

    return getDocumentationLinkFromAutocomplete(request, docLinkVersion);
  }

  private async getAutocompleteType(
    model: monaco.editor.ITextModel,
    { lineNumber, column }: monaco.Position
  ): Promise<AutocompleteType | null> {
    // get the current request on this line
    const currentRequests = await this.getRequestsBetweenLines(model, lineNumber, lineNumber);
    const currentRequest = currentRequests.at(0);
    // if there is no request, suggest method
    if (!currentRequest) {
      return AutocompleteType.METHOD;
    }

    // if on the 1st line of the request, suggest method, url or url_params depending on the content
    const { startLineNumber: requestStartLineNumber } = currentRequest;
    if (lineNumber === requestStartLineNumber) {
      // get the content on the line up until the position
      const lineContent = model.getValueInRange({
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: column,
      });
      const lineTokens = getLineTokens(lineContent);
      // if there is 1 or fewer tokens, suggest method
      if (lineTokens.length <= 1) {
        return AutocompleteType.METHOD;
      }
      // if there are 2 tokens, look at the 2nd one and suggest path or url_params
      if (lineTokens.length === 2) {
        const token = lineTokens[1];
        if (containsUrlParams(token)) {
          return AutocompleteType.URL_PARAMS;
        }
        return AutocompleteType.PATH;
      }
      // if more than 2 tokens, no suggestions
      return null;
    }

    // if not on the 1st line of the request, suggest request body

    return AutocompleteType.BODY;
  }

  private async getSuggestions(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext
  ) {
    // determine autocomplete type
    const autocompleteType = await this.getAutocompleteType(model, position);
    if (!autocompleteType) {
      return {
        suggestions: [],
      };
    }
    if (autocompleteType === AutocompleteType.METHOD) {
      return {
        // suggest all methods, the editor will filter according to the input automatically
        suggestions: getMethodCompletionItems(model, position),
      };
    }
    if (autocompleteType === AutocompleteType.PATH) {
      return {
        suggestions: getUrlPathCompletionItems(model, position),
      };
    }

    if (autocompleteType === AutocompleteType.URL_PARAMS) {
      return {
        suggestions: getUrlParamsCompletionItems(model, position),
      };
    }

    if (autocompleteType === AutocompleteType.BODY) {
      // suggestions only when triggered by " or keyboard
      if (context.triggerCharacter && context.triggerCharacter !== '"') {
        return { suggestions: [] };
      }
      const requests = await this.getRequestsBetweenLines(
        model,
        position.lineNumber,
        position.lineNumber
      );
      const requestStartLineNumber = requests[0].startLineNumber;
      const suggestions = getBodyCompletionItems(model, position, requestStartLineNumber);
      return {
        suggestions,
      };
    }

    return {
      suggestions: [],
    };
  }
  public provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext,
    token: monaco.CancellationToken
  ): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
    return this.getSuggestions(model, position, context);
  }
}
