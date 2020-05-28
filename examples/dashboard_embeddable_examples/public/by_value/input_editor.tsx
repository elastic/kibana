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
import { EuiButton, EuiCodeEditor } from '@elastic/eui';

// @ts-ignore
const TextMode = window.ace.acequire('ace/mode/json').Mode;
export const InputEditor = <T,>(props: { initialValue: T; onSubmit: (value: T) => void }) => {
  const [value, setValue] = React.useState(JSON.stringify(props.initialValue, null, 4));
  const isValid = (() => {
    try {
      JSON.parse(value);
      return true;
    } catch (e) {
      return false;
    }
  })();
  return (
    <>
      <EuiCodeEditor
        mode={new TextMode()}
        theme="github"
        width="100%"
        value={value}
        onChange={setValue}
        setOptions={{ fontSize: '14px' }}
      />
      <EuiButton onClick={() => props.onSubmit(JSON.parse(value))} disabled={!isValid}>
        Update Input
      </EuiButton>
    </>
  );
};
