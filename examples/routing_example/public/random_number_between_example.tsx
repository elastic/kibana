/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { useState } from 'react';
import {
  EuiText,
  EuiButton,
  EuiLoadingSpinner,
  EuiFieldText,
  EuiCallOut,
  EuiFormRow,
} from '@elastic/eui';
import { HttpFetchError } from '@kbn/core/public';
import { isError } from './is_error';
import { Services } from './services';

interface Props {
  fetchRandomNumberBetween: Services['fetchRandomNumberBetween'];
}

export function RandomNumberBetweenRouteExample({ fetchRandomNumberBetween }: Props) {
  const [error, setError] = useState<HttpFetchError | undefined>();
  const [randomNumber, setRandomNumber] = useState<number>(0);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [maxInput, setMaxInput] = useState<string>('10');

  const doFetch = useCallback(async () => {
    if (isFetching) return;
    setIsFetching(true);
    const response = await fetchRandomNumberBetween(Number.parseInt(maxInput, 10));

    if (isError(response)) {
      setError(response);
    } else {
      setRandomNumber(response);
    }

    setIsFetching(false);
  }, [isFetching, maxInput, fetchRandomNumberBetween]);

  return (
    <React.Fragment>
      <EuiText>
        <h2>GET example with query</h2>
        <p>
          This examples uses a simple GET route that takes a query parameter in the request and
          returns a single number.
        </p>
        <EuiFormRow label="Generate a random number between 0 and">
          <EuiFieldText
            data-test-subj="routingExampleMaxRandomNumberBetween"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            isInvalid={isNaN(Number(maxInput))}
          />
        </EuiFormRow>

        <EuiFormRow hasEmptyLabelSpace={true}>
          <EuiButton
            data-test-subj="routingExampleFetchRandomNumberBetween"
            disabled={isFetching || isNaN(Number(maxInput))}
            onClick={() => doFetch()}
          >
            {isFetching ? <EuiLoadingSpinner /> : 'Generate random number'}
          </EuiButton>
        </EuiFormRow>

        {error !== undefined ? (
          <EuiCallOut color="danger" iconType="alert">
            {error.message}
          </EuiCallOut>
        ) : null}
        {randomNumber > -1 ? (
          <h2>
            Random number is
            <div data-test-subj="routingExampleRandomNumberBetween">{randomNumber}</div>
          </h2>
        ) : null}
      </EuiText>
    </React.Fragment>
  );
}
