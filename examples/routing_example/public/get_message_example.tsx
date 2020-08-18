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
  getMessageById: Services['getMessageById'];
}

export function GetMessageRouteExample({ getMessageById }: Props) {
  const [error, setError] = useState<HttpFetchError | undefined>();
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [id, setId] = useState<string>('');

  const doFetch = useCallback(async () => {
    if (isFetching) return;
    setIsFetching(true);
    const response = await getMessageById(id);

    if (isError(response)) {
      setError(response);
      setMessage('');
    } else {
      setError(undefined);
      setMessage(response);
    }

    setIsFetching(false);
  }, [isFetching, getMessageById, setMessage, id]);

  return (
    <React.Fragment>
      <EuiText>
        <h2>GET example with param</h2>

        <p>This examples uses a simple GET route that takes an id as a param in the route path.</p>
        <EuiFormRow label="Message Id">
          <EuiFieldText
            value={id}
            onChange={(e) => setId(e.target.value)}
            data-test-subj="routingExampleGetMessageId"
          />
        </EuiFormRow>

        <EuiFormRow hasEmptyLabelSpace={true}>
          <EuiButton
            data-test-subj="routingExampleFetchMessage"
            disabled={isFetching || id === ''}
            onClick={() => doFetch()}
          >
            {isFetching ? <EuiLoadingSpinner /> : 'Get message'}
          </EuiButton>
        </EuiFormRow>

        {error !== undefined ? (
          <EuiCallOut color="danger" iconType="alert">
            {error.message}
          </EuiCallOut>
        ) : null}
        {message !== '' ? (
          <p>
            Message is: <pre data-test-subj="routingExampleGetMessage">{message}</pre>
          </p>
        ) : null}
      </EuiText>
    </React.Fragment>
  );
}
