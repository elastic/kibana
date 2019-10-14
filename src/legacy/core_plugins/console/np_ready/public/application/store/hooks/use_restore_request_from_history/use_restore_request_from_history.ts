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

import { instance as registry } from '../../editor_registry';
import { useEditorActionContext } from '../../../contexts/editor';
import { restoreRequestFromHistory } from './restore_request_from_history';

export const useRestoreFromRequestHistory = () => {
  const dispatch = useEditorActionContext();

  const restoreFromHistory = (req: any) => {
    try {
      restoreRequestFromHistory(registry.getInputEditor(), req);
    } catch (e) {
      dispatch({ type: 'requestRestore.failure', value: e.message });
    }
  };

  return { restoreFromHistory };
};
