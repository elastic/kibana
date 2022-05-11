/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { useState } from 'react';
import { EuiText, EuiButton, EuiLoadingSpinner, EuiCallOut } from '@elastic/eui';
import { HttpFetchError } from '@kbn/core/public';
import { Services } from './services';
import { isError } from './is_error';

interface Props {
  fetchRandomNumber: Services['fetchRandomNumber'];
}

export function RandomNumberRouteExample({ fetchRandomNumber }: Props) {
  const [error, setError] = useState<HttpFetchError | undefined>(undefined);
  const [randomNumber, setRandomNumber] = useState<number>(0);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const doFetch = useCallback(async () => {
    if (isFetching) return;
    setIsFetching(true);
    const response = await fetchRandomNumber();

    if (isError(response)) {
      setError(response);
    } else {
      setRandomNumber(response);
    }

    setIsFetching(false);
  }, [isFetching, fetchRandomNumber]);

  return (
    <React.Fragment>
      <EuiText>
        <h2>GET example</h2>
        <p>
          This examples uses a simple GET route that takes no parameters or body in the request and
          returns a single number.
        </p>
        <EuiButton
          data-test-subj="routingExampleFetchRandomNumber"
          disabled={isFetching}
          onClick={() => doFetch()}
        >
          {isFetching ? <EuiLoadingSpinner /> : 'Generate a random number'}
        </EuiButton>

        {error !== undefined ? (
          <EuiCallOut color="danger" iconType="alert">
            {error}
          </EuiCallOut>
        ) : null}
        {randomNumber > -1 ? (
          <h2>
            Random number is <div data-test-subj="routingExampleRandomNumber">{randomNumber}</div>
          </h2>
        ) : null}
      </EuiText>
    </React.Fragment>
  );
}
