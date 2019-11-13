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
import { useCallback } from 'react';
import { instance as registry } from '../../contexts/editor_context/editor_registry';
import { useServicesContext } from '../../contexts';
import { sendRequestToES } from './send_request_to_es';
import { useRequestActionContext } from '../../contexts/request_context';
// @ts-ignore
import mappings from '../../../../../public/quarantined/src/mappings';

export const useSendCurrentRequestToES = () => {
  const {
    services: { history, settings },
  } = useServicesContext();

  const dispatch = useRequestActionContext();

  return useCallback(async () => {
    dispatch({ type: 'sendRequest', payload: undefined });
    try {
      const editor = registry.getInputEditor();
      const requests = await new Promise<any[]>(resolve => editor.getRequestsInRange(resolve));
      if (!requests.length) {
        dispatch({
          type: 'requestFail',
          payload: 'No requests in range',
        });
        return;
      }
      const { polling } = settings.toJSON();
      const results = await sendRequestToES({
        requests,
      });

      results.forEach(({ request: { path, method, data } }) => {
        history.addToHistory(path, method, data);
      });

      if (polling) {
        // If the user has submitted a request against ES, something in the fields, indices, aliases,
        // or templates may have changed, so we'll need to update this data. Assume that if
        // the user disables polling they're trying to optimize performance or otherwise
        // preserve resources, so they won't want this request sent either.
        mappings.retrieveAutoCompleteInfo();
      }

      dispatch({
        type: 'requestSuccess',
        payload: {
          data: results,
        },
      });
    } catch (e) {
      dispatch({
        type: 'requestFail',
        payload: e.message,
      });
    }
  }, [dispatch]);
};
