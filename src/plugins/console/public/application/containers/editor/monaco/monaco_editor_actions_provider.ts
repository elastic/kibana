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
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { isQuotaExceededError } from '../../../../services/history';
import { DEFAULT_VARIABLES } from '../../../../../common/constants';
import { getStorage, StorageKeys } from '../../../../services';
import { sendRequest } from '../../../hooks';
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
  getAutoIndentedRequests,
} from './utils';

import type { AdjustedParsedRequest } from './types';
import { StorageQuotaError } from '../../../components/storage_quota_error';
import { ContextValue } from '../../../contexts';

const AUTO_INDENTATION_ACTION_LABEL = 'Apply indentations';

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

  public async sendRequests(dispatch: Dispatch<Actions>, context: ContextValue): Promise<void> {
    const {
      services: { notifications, trackUiMetric, http, settings, history, autocompleteInfo },
      ...startServices
    } = context;
    const { toasts } = notifications;
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

      let saveToHistoryError: undefined | Error;
      const isHistoryEnabled = settings.getIsHistoryEnabled();

      if (isHistoryEnabled) {
        results.forEach(({ request: { path, method, data } }) => {
          try {
            history.addToHistory(path, method, data);
          } catch (e) {
            // Grab only the first error
            if (!saveToHistoryError) {
              saveToHistoryError = e;
            }
          }
        });

        if (saveToHistoryError) {
          const errorTitle = i18n.translate('console.notification.error.couldNotSaveRequestTitle', {
            defaultMessage: 'Could not save request to Console history.',
          });
          if (isQuotaExceededError(saveToHistoryError)) {
            const toast = notifications.toasts.addWarning({
              title: i18n.translate('console.notification.error.historyQuotaReachedMessage', {
                defaultMessage:
                  'Request history is full. Clear the console history or disable saving new requests.',
              }),
              text: toMountPoint(
                StorageQuotaError({
                  onClearHistory: () => {
                    history.clearHistory();
                    notifications.toasts.remove(toast);
                  },
                  onDisableSavingToHistory: () => {
                    settings.setIsHistoryEnabled(false);
                    notifications.toasts.remove(toast);
                  },
                }),
                startServices
              ),
            });
          } else {
            // Best effort, but still notify the user.
            notifications.toasts.addError(saveToHistoryError, {
              title: errorTitle,
            });
          }
        }
      }

      const polling = settings.getPolling();
      if (polling) {
        // If the user has submitted a request against ES, something in the fields, indices, aliases,
        // or templates may have changed, so we'll need to update this data. Assume that if
        // the user disables polling they're trying to optimize performance or otherwise
        // preserve resources, so they won't want this request sent either.
        autocompleteInfo.retrieve(settings, settings.getAutocomplete());
      }

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

  /*
   * This function inserts a request from the history into the editor
   */
  public async restoreRequestFromHistory(request: string) {
    const model = this.editor.getModel();
    if (!model) {
      return;
    }
    let position = this.editor.getPosition() as monaco.IPosition;
    const requests = await this.getSelectedParsedRequests();
    let prefix = '';
    let suffix = '';
    // if there are requests at the cursor/selection, insert either before or after
    if (requests.length > 0) {
      // if on the 1st line of the 1st request, insert at the beginning of that line
      if (position && position.lineNumber === requests[0].startLineNumber) {
        position = { column: 1, lineNumber: position.lineNumber };
        suffix = '\n';
      } else {
        // otherwise insert at the end of the last line of the last request
        const lastLineNumber = requests[requests.length - 1].endLineNumber;
        position = { column: model.getLineMaxColumn(lastLineNumber), lineNumber: lastLineNumber };
        prefix = '\n';
      }
    } else {
      // if not inside a request, insert the request at the cursor line
      if (position) {
        // insert at the beginning of the cursor line
        position = { lineNumber: position.lineNumber, column: 1 };
      } else {
        // otherwise insert on line 1
        position = { lineNumber: 1, column: 1 };
      }
      suffix = '\n';
    }
    const edit: monaco.editor.IIdentifiedSingleEditOperation = {
      range: {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      },
      text: prefix + request + suffix,
      forceMoveMarkers: true,
    };
    this.editor.executeEdits('restoreFromHistory', [edit]);
  }

  /*
  This function returns the text in the provided range.
  If no range is provided, it returns all text in the editor.
  */
  private getTextInRange(selectionRange?: monaco.IRange): string {
    const model = this.editor.getModel();
    if (!model) {
      return '';
    }
    if (selectionRange) {
      const { startLineNumber, startColumn, endLineNumber, endColumn } = selectionRange;
      return model.getValueInRange({
        startLineNumber,
        startColumn,
        endLineNumber,
        endColumn,
      });
    }
    // If no range is provided, return all text in the editor
    return model.getValue();
  }

  /**
   * This function applies indentations to the request in the selected text.
   */
  public async autoIndent() {
    const parsedRequests = await this.getSelectedParsedRequests();
    const selectionStartLineNumber = parsedRequests[0].startLineNumber;
    const selectionEndLineNumber = parsedRequests[parsedRequests.length - 1].endLineNumber;
    const selectedRange = new monaco.Range(
      selectionStartLineNumber,
      1,
      selectionEndLineNumber,
      this.editor.getModel()?.getLineMaxColumn(selectionEndLineNumber) ?? 1
    );

    if (parsedRequests.length < 1) {
      return;
    }

    const selectedText = this.getTextInRange(selectedRange);
    const allText = this.getTextInRange();

    const autoIndentedText = getAutoIndentedRequests(parsedRequests, selectedText, allText);

    this.editor.executeEdits(AUTO_INDENTATION_ACTION_LABEL, [
      {
        range: selectedRange,
        text: autoIndentedText,
      },
    ]);
  }

  /**
   * This function moves the cursor to the previous request edge (start/end line).
   * If the cursor is inside a request, it is moved to the start line of this request.
   * If there are no requests before the cursor, it is moved at the first line in the editor.
   */
  public async moveToPreviousRequestEdge() {
    const currentPosition = this.editor.getPosition();
    const model = this.editor.getModel();
    if (!currentPosition || !model) {
      return;
    }
    const { lineNumber: currentLineNumber } = currentPosition;
    // Get all requests before the current line
    const requestsBefore = await this.getRequestsBetweenLines(model, 1, currentLineNumber - 1);
    if (requestsBefore.length === 0) {
      // If no requests before current line, set position to first line
      this.editor.setPosition({ lineNumber: 1, column: 1 });
      return;
    }
    const lastRequestBefore = requestsBefore[requestsBefore.length - 1];
    if (lastRequestBefore.endLineNumber < currentLineNumber) {
      this.editor.setPosition({ lineNumber: lastRequestBefore.endLineNumber, column: 1 });
    } else {
      // If the end line of the request is after the current line, then the cursor is inside the request
      // The previous request edge is the start line of the request
      this.editor.setPosition({ lineNumber: lastRequestBefore.startLineNumber, column: 1 });
    }
  }

  /**
   * This function moves the cursor to the next request edge.
   * If the cursor is inside a request, it is moved to the end line of this request.
   * If there are no requests after the cursor, it is moved at the last line in the editor.
   */
  public async moveToNextRequestEdge() {
    const currentPosition = this.editor.getPosition();
    const model = this.editor.getModel();
    if (!currentPosition || !model) {
      return;
    }
    const { lineNumber: currentLineNumber } = currentPosition;
    // Get all requests before the current line
    const requestsAfter = await this.getRequestsBetweenLines(
      model,
      currentLineNumber + 1,
      model.getLineCount()
    );
    if (requestsAfter.length === 0) {
      // If no requests after current line, set position to last line
      this.editor.setPosition({ lineNumber: model.getLineCount(), column: 1 });
      return;
    }
    const firstRequestAfter = requestsAfter[0];
    if (firstRequestAfter.startLineNumber > currentLineNumber) {
      this.editor.setPosition({ lineNumber: firstRequestAfter.startLineNumber, column: 1 });
    } else {
      // If the start line of the request is before the current line, then the cursor is inside the request
      // The next request edge is the end line of the request
      this.editor.setPosition({ lineNumber: firstRequestAfter.endLineNumber, column: 1 });
    }
  }
}
