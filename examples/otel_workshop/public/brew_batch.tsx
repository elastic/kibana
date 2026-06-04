/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import {
  EuiText,
  EuiButton,
  EuiLoadingSpinner,
  EuiFieldNumber,
  EuiFormRow,
  EuiCallOut,
  EuiSpacer,
  EuiStat,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
} from '@elastic/eui';
import { isHttpFetchError } from '@kbn/core-http-browser';
import type { BatchSummary } from '../common';
import type { Services } from './services';

interface Props {
  brewBatch: Services['brewBatch'];
}

export function BrewBatch({ brewBatch }: Props) {
  const [count, setCount] = useState(25);
  const [summary, setSummary] = useState<BatchSummary | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isBrewing, setIsBrewing] = useState(false);

  const doBrew = useCallback(async () => {
    if (isBrewing) return;
    setIsBrewing(true);
    setError(undefined);

    const response = await brewBatch(count);
    if (isHttpFetchError(response)) {
      setSummary(undefined);
      setError(response.message);
    } else {
      setError(undefined);
      setSummary(response);
    }

    setIsBrewing(false);
  }, [isBrewing, brewBatch, count]);

  return (
    <EuiText>
      <h2>Generate load</h2>
      <p>
        Fires many orders at once through <code>POST /internal/otel_workshop/brew_batch</code>.
        Because the orders run concurrently, this is what makes the in-flight count climb above 1
        and fills your backend with a useful spread of data. Run this, then go look at your metrics
        and traces.
      </p>

      <EuiFormRow label="How many orders?">
        <EuiFieldNumber
          data-test-subj="otelWorkshopBatchCount"
          min={1}
          max={200}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
      </EuiFormRow>
      <EuiFormRow hasEmptyLabelSpace>
        <EuiButton
          data-test-subj="otelWorkshopBrewBatch"
          disabled={isBrewing}
          onClick={() => doBrew()}
        >
          {isBrewing ? <EuiLoadingSpinner /> : `Brew a batch of ${count} ☕☕☕`}
        </EuiButton>
      </EuiFormRow>

      {summary ? (
        <>
          <EuiSpacer size="s" />
          <EuiPanel hasShadow={false} hasBorder data-test-subj="otelWorkshopBatchSummary">
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiStat title={summary.requested} description="Requested" titleColor="primary" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiStat title={summary.served} description="Served" titleColor="success" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiStat title={summary.failed} description="Failed" titleColor="danger" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </>
      ) : null}
      {error ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut announceOnMount color="danger" iconType="warning" title="Batch failed">
            {error}
          </EuiCallOut>
        </>
      ) : null}
    </EuiText>
  );
}
