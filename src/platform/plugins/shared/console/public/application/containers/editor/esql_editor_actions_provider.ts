/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch } from 'react';
import { debounce } from 'lodash';
import type { monaco } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import { sendRequest } from '../../hooks';
import type { Actions } from '../../stores/request';

import { SELECTED_REQUESTS_CLASSNAME, trackSentRequests } from './utils';

import type { ContextValue } from '../../contexts';

const DEBOUNCE_HIGHLIGHT_WAIT_MS = 200;

interface ParsedQuery {
  query: string;
  lineNumber: number;
}

export class EsqlEditorActionsProvider {
  private highlightedLines: monaco.editor.IEditorDecorationsCollection;
  selectedLines: number[];
  constructor(private editor: monaco.editor.IStandaloneCodeEditor) {
    this.highlightedLines = this.editor.createDecorationsCollection();
    this.selectedLines = [];

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
    // editor.onDidChangeCursorPosition(async (event) => {
    //   await debouncedHighlightRequests();
    // });
    // editor.onDidScrollChange(async (event) => {
    //   await debouncedHighlightRequests();
    // });
    // editor.onDidChangeCursorSelection(async (event) => {
    //   await debouncedHighlightRequests();
    // });
    // editor.onDidContentSizeChange(async (event) => {
    //   await debouncedHighlightRequests();
    // });
    editor.onMouseDown(async (event) => {
      const selectedLine = event.target.position?.lineNumber;
      if (selectedLine === undefined) {
        return;
      }

      if (event.event.leftButton && event.event.altKey) {
        // user did Ctrl+Click - append to selected lines
        event.event.preventDefault();
        this.selectedLines.push(selectedLine);
      } else if (event.event.leftButton) {
        // User clicked - delete selected requests so far and add current line
        this.selectedLines = [selectedLine];
      }
      await debouncedHighlightRequests();
    });

    editor.onKeyDown((event) => {
      if (!event.altKey) {
        this.clearEditorDecorations();
      }
    });
  }

  private clearEditorDecorations() {
    // remove the highlighted lines
    this.highlightedLines.clear();
  }

  private async highlightRequests(): Promise<void> {
    const parsedQueries = await this.getSelectedParsedQueries();
    if (parsedQueries.length > 0) {
      const decorations: monaco.editor.IModelDeltaDecoration[] = [];
      parsedQueries.forEach((parsedQuery) => {
        decorations.push({
          range: {
            startLineNumber: parsedQuery.lineNumber,
            endLineNumber: parsedQuery.lineNumber,
            startColumn: 1,
            endColumn: this.editor.getModel()?.getLineMaxColumn(parsedQuery.lineNumber) ?? 1,
          },
          options: {
            isWholeLine: true,
            blockClassName: SELECTED_REQUESTS_CLASSNAME,
          },
        });
      });
      this.highlightedLines.set(decorations);
    } else {
      // if no requests are selected, hide actions buttons and remove highlighted lines
      this.highlightedLines.clear();
    }
  }

  private async getSelectedParsedQueries(): Promise<ParsedQuery[]> {
    const model = this.editor.getModel();

    if (!model) {
      return [];
    }

    if (!model || !this.selectedLines) {
      return Promise.resolve([]);
    }
    const result: ParsedQuery[] = [];
    this.selectedLines
      .sort((a, b) => Number(a) - Number(b))
      .forEach((line) => {
        const query = model.getLineContent(line);
        if (
          query &&
          (query.startsWith('FROM') || query.startsWith('ROW') || query.startsWith('SHOW'))
        ) {
          result.push({
            query,
            lineNumber: line,
          });
        }
      });
    return Promise.resolve(result);
  }

  public async getQueries() {
    const model = this.editor.getModel();
    if (!model) {
      return [];
    }

    const parsedRequests = await this.getSelectedParsedQueries();
    return parsedRequests;
  }

  public getCurrentQuery(): string {
    const model = this.editor.getModel();
    if (!model) {
      return '';
    }

    const query = model.getLineContent(this.editor.getPosition()?.lineNumber ?? 1);

    return query;
  }

  public async sendQueries(
    dispatch: Dispatch<Actions>,
    context: ContextValue,
    timeRange: { start: string; end: string } | undefined
  ): Promise<void> {
    const {
      services: { notifications, trackUiMetric, http, settings },
    } = context;

    const { toasts } = notifications;
    const requests: Array<{
      url: string;
      method: string;
      data: string[];
      lineNumber?: number;
      query: string;
    }> = [];
    const queries = await this.getQueries();
    queries.forEach(({ query, lineNumber }) => {
      const formattedQuery = timeRange
        ? query
            .replace('?_tend', '\\"' + timeRange.end + '\\"')
            .replace('?_tstart', '\\"' + timeRange.start + '\\"')
        : query;
      const request = {
        method: 'POST',
        url: '_query',
        lineNumber,
        data: ['{"query":"' + formattedQuery + '"}'],
        query: formattedQuery,
      };
      requests.push(request);
    });
    if (requests.length === 0) {
      return;
    }
    try {
      dispatch({ type: 'sendRequest', payload: undefined });

      // track the requests
      setTimeout(() => trackSentRequests(requests, trackUiMetric), 0);

      const selectedHost = settings.getSelectedHost();
      const results = await sendRequest({ http, requests, host: selectedHost || undefined });

      dispatch({
        type: 'requestSuccess',
        payload: {
          data: results,
        },
      });
    } catch (e) {
      toasts.addError(e, {
        title: i18n.translate('console.notification.monaco.error.unknownErrorTitle', {
          defaultMessage: 'Unknown Request Error',
        }),
      });
    }
  }
}
