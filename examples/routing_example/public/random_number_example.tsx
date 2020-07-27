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
import React, { useCallback } from 'react';
import { useState } from 'react';
import { EuiText, EuiButton, EuiLoadingSpinner, EuiCallOut } from '@elastic/eui';
import { HttpFetchError } from '../../../src/core/public';
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
