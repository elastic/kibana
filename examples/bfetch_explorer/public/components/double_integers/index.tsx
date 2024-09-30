/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import useList from 'react-use/lib/useList';
import useCounter from 'react-use/lib/useCounter';
import { EuiForm, EuiSpacer, EuiTextArea, EuiFormRow, EuiButton } from '@elastic/eui';
import { ExplorerService } from '../../plugin';

interface ResultItem {
  num: number;
  result?: {
    num: number;
  };
  error?: any;
}

const defaultNumbers = [2000, 300, -1, 1000].join('\n');

export interface Props {
  double: ExplorerService['double'];
}

export const DoubleIntegers: React.FC<Props> = ({ double }) => {
  const isMounted = useMountedState();
  const [numbers, setNumbers] = useState(defaultNumbers);
  const [showingResults, setShowingResults] = useState(false);
  const [numberOfResultsAwaiting, counter] = useCounter(0);
  const [results, { push: pushResult, clear: clearList }] = useList<ResultItem>([]);

  const handleSubmit = () => {
    setShowingResults(true);
    const nums = numbers
      .split('\n')
      .map((num) => num.trim())
      .filter(Boolean)
      .map(Number);
    counter.set(nums.length);
    nums.forEach((num) => {
      double({ num }).then(
        (result) => {
          if (!isMounted()) return;
          counter.dec();
          pushResult({ num, result });
        },
        (error) => {
          if (!isMounted()) return;
          counter.dec();
          pushResult({ num, error });
        }
      );
    });
  };

  const handleReset = () => {
    setShowingResults(false);
    counter.reset();
    clearList();
  };

  if (showingResults) {
    return (
      <EuiForm data-test-subj="DoubleIntegers">
        <pre>{JSON.stringify(results, null, 4)}</pre>
        <EuiSpacer size="l" />
        <EuiButton disabled={!!numberOfResultsAwaiting} onClick={handleReset}>
          Reset
        </EuiButton>
      </EuiForm>
    );
  }

  return (
    <EuiForm data-test-subj="DoubleIntegers">
      <EuiFormRow label="Numbers in ms separated by new line" fullWidth>
        <EuiTextArea
          fullWidth
          placeholder="Enter numbers in milliseconds separated by new line"
          value={numbers}
          onChange={(e) => setNumbers(e.target.value)}
        />
      </EuiFormRow>
      <EuiButton type="submit" fill onClick={handleSubmit}>
        Send
      </EuiButton>
    </EuiForm>
  );
};
