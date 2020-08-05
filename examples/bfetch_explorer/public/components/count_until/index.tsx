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

import React, { useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import useList from 'react-use/lib/useList';
import { EuiForm, EuiSpacer, EuiFieldNumber, EuiFormRow, EuiButton } from '@elastic/eui';
import { BfetchPublicSetup } from '../../../../../src/plugins/bfetch/public';

export interface Props {
  fetchStreaming: BfetchPublicSetup['fetchStreaming'];
}

export const CountUntil: React.FC<Props> = ({ fetchStreaming }) => {
  const isMounted = useMountedState();
  const [data, setData] = useState(5);
  const [showingResults, setShowingResults] = useState(false);
  const [results, { push: pushResult, clear: clearList }] = useList<string>([]);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<any>(null);

  const handleSubmit = () => {
    setShowingResults(true);
    const { stream } = fetchStreaming({
      url: '/bfetch_explorer/count',
      body: JSON.stringify({ data }),
    });
    stream.subscribe({
      next: (next: string) => {
        if (!isMounted()) return;
        pushResult(next);
      },
      error: (nextError: any) => {
        if (!isMounted()) return;
        setError(nextError);
      },
      complete: () => {
        if (!isMounted()) return;
        setCompleted(true);
      },
    });
  };

  const handleReset = () => {
    setShowingResults(false);
    clearList();
    setError(null);
    setCompleted(false);
  };

  if (showingResults) {
    return (
      <EuiForm data-test-subj="CountUntil">
        <pre>{JSON.stringify(error || results, null, 4)}</pre>
        <EuiSpacer size="l" />
        <EuiButton disabled={!completed} onClick={handleReset}>
          Reset
        </EuiButton>
      </EuiForm>
    );
  }

  return (
    <EuiForm data-test-subj="CountUntil">
      <EuiFormRow label="Some integer" fullWidth>
        <EuiFieldNumber
          placeholder="Some integer"
          value={data}
          onChange={(e) => setData(Number(e.target.value))}
        />
      </EuiFormRow>
      <EuiButton type="submit" fill onClick={handleSubmit}>
        Start
      </EuiButton>
    </EuiForm>
  );
};
