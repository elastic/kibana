/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import useList from 'react-use/lib/useList';
import { EuiForm, EuiSpacer, EuiFieldNumber, EuiFormRow, EuiButton } from '@elastic/eui';
import { BfetchPublicSetup } from '@kbn/bfetch-plugin/public';

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
