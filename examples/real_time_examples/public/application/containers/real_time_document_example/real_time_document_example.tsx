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

import React from 'react';
import {
  EuiFieldText,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';
import useMountedState from 'react-use/lib/useMountedState';
import { useRealTimeExamples } from '../../context';
import { SavedObject } from '../../../../../../src/core/public';
import { SavedObjectEditor } from './saved_object_editor';

export const RealTimeDocumentExample: React.FC = () => {
  const { start } = useRealTimeExamples();
  const [type, setType] = React.useState('canvas-workpad');
  const [id, setId] = React.useState('');
  const [so, setSo] = React.useState<null | SavedObject>(null);
  const isMounted = useMountedState();

  const loadSavedObject = async () => {
    setSo(null);
    const savedObject = await start.savedObjects.client.get(type, id);
    if (!isMounted()) return;
    setSo(savedObject);
  };

  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label="Saved object type">
            <EuiFieldText
              placeholder="Saved object type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Saved object ID">
            <EuiFieldText
              placeholder="Saved object ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiButton onClick={loadSavedObject}>Load saved object</EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiSpacer />

      {!!so && <SavedObjectEditor so={so} />}
    </div>
  );
};
