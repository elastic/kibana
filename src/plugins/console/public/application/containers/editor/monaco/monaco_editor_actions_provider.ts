/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ConsoleParsedRequestsProvider,
  getParsedRequestsProvider,
  monaco,
  ParsedRequest,
} from '@kbn/monaco';
import { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import { Dispatch } from 'react';
import type { HttpSetup } from '@kbn/core-http-browser';
import { sendRequest } from '../../../hooks/use_send_current_request/send_request';
import { DEFAULT_VARIABLES } from '../../../../../common/constants';
import { MetricsTracker } from '../../../../types';
import { Actions } from '../../../stores/request';
import { getStorage, StorageKeys } from '../../../../services';
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
export class MonacoEditorActionsProvider {
  private parsedRequestsProvider: ConsoleParsedRequestsProvider;
  constructor(private editor: monaco.editor.IStandaloneCodeEditor) {
    this.parsedRequestsProvider = getParsedRequestsProvider(editor.getModel());
  }

  private async getParsedRequests(): Promise<ParsedRequest[]> {
    const model = this.editor.getModel();
    const selection = this.editor.getSelection();
    if (!model || !selection) {
      return Promise.resolve([]);
    }
    const { startLineNumber, startColumn, endLineNumber, endColumn } = selection;
    const selectionStartOffset = model.getOffsetAt({
      lineNumber: startLineNumber,
      column: startColumn,
    });
    const selectionEndOffset = model.getOffsetAt({ lineNumber: endLineNumber, column: endColumn });
    const parsedRequests = await this.parsedRequestsProvider.getRequests();
    const selectedRequests = [];
    for (const parsedRequest of parsedRequests) {
      const { startOffset: requestStart, endOffset: requestEnd } = parsedRequest;
      if (requestStart - 1 >= selectionEndOffset) {
        // request is past the selection, no need to check further requests
        break;
      }
      if (requestEnd - 1 < selectionStartOffset) {
        // request is before the selection, do nothing
      } else {
        // request is selected
        selectedRequests.push(parsedRequest);
      }
    }
    return selectedRequests;
  }

  private async getRequests() {
    const parsedRequests = await this.getParsedRequests();
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
