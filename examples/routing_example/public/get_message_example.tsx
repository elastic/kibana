/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import { type IHttpFetchError, isHttpFetchError } from '@kbn/core-http-browser';
import { Services } from './services';

interface Props {
  getMessageById: Services['getMessageById'];
}

export function GetMessageRouteExample({ getMessageById }: Props) {
  const [error, setError] = useState<IHttpFetchError | undefined>();
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [id, setId] = useState<string>('');

  const doFetch = useCallback(async () => {
    if (isFetching) return;
    setIsFetching(true);
    const response = await getMessageById(id);

    if (isHttpFetchError(response)) {
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
          <EuiCallOut color="danger" iconType="warning">
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
