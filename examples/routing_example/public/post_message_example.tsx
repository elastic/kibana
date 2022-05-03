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
  EuiTextArea,
} from '@elastic/eui';
import { HttpFetchError } from '@kbn/core/public';
import { isError } from './is_error';
import { Services } from './services';

interface Props {
  postMessage: Services['postMessage'];
  addSuccessToast: Services['addSuccessToast'];
}

export function PostMessageRouteExample({ postMessage, addSuccessToast }: Props) {
  const [error, setError] = useState<HttpFetchError | undefined>();
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [id, setId] = useState<string>('');

  const doFetch = useCallback(async () => {
    if (isPosting) return;
    setIsPosting(true);
    const response = await postMessage(message, id);

    if (response && isError(response)) {
      setError(response);
    } else {
      setError(undefined);
      addSuccessToast('Message was added!');
      setMessage('');
      setId('');
    }

    setIsPosting(false);
  }, [isPosting, postMessage, addSuccessToast, setMessage, message, id]);

  return (
    <React.Fragment>
      <EuiText>
        <h2>POST example with body</h2>
        <p>
          This examples uses a simple POST route that takes a body parameter and an id as a param in
          the route path.
        </p>
        <EuiFormRow label="Message Id">
          <EuiFieldText
            value={id}
            onChange={(e) => setId(e.target.value)}
            data-test-subj="routingExampleSetMessageId"
          />
        </EuiFormRow>
        <EuiFormRow label="Message">
          <EuiTextArea
            data-test-subj="routingExampleSetMessage"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </EuiFormRow>

        <EuiFormRow hasEmptyLabelSpace={true}>
          <EuiButton
            data-test-subj="routingExamplePostMessage"
            disabled={isPosting || id === '' || message === ''}
            onClick={() => doFetch()}
          >
            {isPosting ? <EuiLoadingSpinner /> : 'Post message'}
          </EuiButton>
        </EuiFormRow>

        {error !== undefined ? (
          <EuiCallOut color="danger" iconType="alert">
            {error.message}
          </EuiCallOut>
        ) : null}
      </EuiText>
    </React.Fragment>
  );
}
