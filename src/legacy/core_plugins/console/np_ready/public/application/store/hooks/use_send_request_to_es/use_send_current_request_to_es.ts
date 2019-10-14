/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useAppContext } from '../../../contexts/app';
import { useEditorActionContext, useEditorReadContext } from '../../../contexts/editor';
import { sendCurrentRequestToES as _sendCurrentRequestToES } from './send_current_request_to_es';
import { instance as registry } from '../../editor_registry';

export const useSendCurrentRequestToES = () => {
  const {
    services: { history },
  } = useAppContext();
  const { settings } = useEditorReadContext();
  const dispatch = useEditorActionContext();

  const sendCurrentRequestToES = async () => {
    try {
      dispatch({ type: 'request.start', value: undefined });
      const result = await new Promise<{
        esPath: string;
        esMethod: string;
        esData: object;
      }>((resolve, reject) =>
        _sendCurrentRequestToES({
          isPolling: settings.polling,
          isUsingTripleQuotes: settings.tripleQuotes,
          input: registry.getInputEditor(),
          output: registry.getOutputEditor(),
          callback: (esPath: string, esMethod: string, esData: object) =>
            resolve({ esPath, esMethod, esData }),
          failureCallback: reject,
        })
      );
      history.addToHistory(result.esPath, result.esMethod, result.esData);
      dispatch({ type: 'request.success', value: undefined });
    } catch (e) {
      dispatch({ type: 'request.failed', value: e.message });
    }
  };

  return { sendCurrentRequestToES };
};
