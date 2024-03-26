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
import { removeTrailingWhitespaces, replaceVariables } from './utils';
import { constructUrl } from '../../../lib/es/es';
import { getStorage, StorageKeys } from '../../../services';
import { DEFAULT_VARIABLES } from '../../../../common/constants';
import { DevToolsVariable } from '../../components';

const getCurlRequest = (
  parsedRequest: ParsedRequest,
  elasticsearchBaseUrl: string,
  variables: DevToolsVariable[]
) => {
  let url = removeTrailingWhitespaces(parsedRequest.url);
  url = replaceVariables(url, variables);
  url = constructUrl(elasticsearchBaseUrl, url);
  let curlRequest = `curl -X${parsedRequest.method.toUpperCase()} "${url}" -H "kbn-xsrf: reporting"`;
  if (parsedRequest.data && parsedRequest.data.length > 0) {
    curlRequest += ` -H "Content-Type: application/json" -d'\n`;
    for (const data of parsedRequest.data) {
      curlRequest += replaceVariables(JSON.stringify(data, null, 2), variables);
    }
    curlRequest += "'";
  }
  return curlRequest;
};
export class MonacoSenseEditor {
  private parsedRequestsProvider: ConsoleParsedRequestsProvider;
  constructor(private editor: monaco.editor.IStandaloneCodeEditor) {
    this.parsedRequestsProvider = getParsedRequestsProvider(editor.getModel());
  }

  private async getRequestsInRange(): Promise<ParsedRequest[]> {
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
  public async getRequestsAsCURL(elasticsearchBaseUrl: string): Promise<string> {
    // get variables values
    const variables = getStorage().get(StorageKeys.VARIABLES, DEFAULT_VARIABLES);
    // get selected requests
    const requests = await this.getRequestsInRange();

    const curlRequests = requests.map((request) =>
      getCurlRequest(request, elasticsearchBaseUrl, variables)
    );
    return curlRequests.join('\n');
  }
}
