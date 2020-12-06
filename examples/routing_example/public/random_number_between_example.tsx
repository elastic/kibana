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
import {
  EuiText,
  EuiButton,
  EuiLoadingSpinner,
  EuiFieldText,
  EuiCallOut,
  EuiFormRow,
} from '@elastic/eui';
import { HttpFetchError } from '../../../src/core/public';
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
