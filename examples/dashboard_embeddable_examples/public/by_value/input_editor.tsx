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
import { EuiButton } from '@elastic/eui';
import { JsonEditor } from '../../../../src/plugins/es_ui_shared/public';

export const InputEditor = <T extends object>(props: {
  input: T;
  onSubmit: (value: T) => void;
}) => {
  const getJsonData = React.useRef(() => props.input);
  const [isValid, setIsValid] = React.useState(true);

  return (
    <>
      <JsonEditor<T>
        defaultValue={props.input}
        onUpdate={(jsonState) => {
          getJsonData.current = jsonState.data.format;
          setIsValid(jsonState.isValid);
        }}
        euiCodeEditorProps={{
          'data-test-subj': 'dashboardEmbeddableByValueInputEditor',
        }}
      />
      <EuiButton
        onClick={() => props.onSubmit(getJsonData.current())}
        disabled={!isValid}
        data-test-subj={'dashboardEmbeddableByValueInputSubmit'}
      >
        Update Input
      </EuiButton>
    </>
  );
};
