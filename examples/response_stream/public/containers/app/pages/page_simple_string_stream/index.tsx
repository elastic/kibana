/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, FC } from 'react';

import {
  EuiButton,
  EuiCallOut,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { useFetchStream } from '@kbn/aiops-utils';

import { ApiSimpleStringStream } from '../../../../../common/api';

import { useDeps } from '../../../../hooks/use_deps';
import { Page } from '../../../../components/page';

export const PageSimpleStringStream: FC = () => {
  const { core } = useDeps();
  const basePath = core.http?.basePath.get() ?? '';

  const [compressResponse, setCompressResponse] = useState(true);

  const { dispatch, errors, start, cancel, data, isRunning } = useFetchStream<
    ApiSimpleStringStream,
    typeof basePath
  >(`${basePath}/internal/response_stream/simple_string_stream`, {
    compressResponse,
    timeout: 500,
  });

  const onClickHandler = async () => {
    if (isRunning) {
      cancel();
    } else {
      // Passing in undefined will reset `data` to an empty string.
      dispatch(undefined);
      start();
    }
  };

  const buttonLabel = isRunning ? 'Stop' : 'Start';

  return (
    <Page title="Simple string stream">
      <EuiText>
        <p>
          This demonstrates a single endpoint with streaming support that sends just chunks of a
          string from server to client. The client uses a custom hook that receives stream chunks
          and passes them on to `useReducer()` that acts on the string chunks it receives. The
          custom hook includes code to buffer chunks and is able to apply them in bulk so the DOM
          does not get hammered with updates. Hit &quot;Start&quot; to trigger the stream!
        </p>
      </EuiText>
      <br />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton type="primary" size="s" onClick={onClickHandler} aria-label={buttonLabel}>
            {buttonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiCheckbox
        id="responseStreamCompressionCheckbox"
        label="Toggle compression setting for response stream."
        checked={compressResponse}
        onChange={(e) => setCompressResponse(!compressResponse)}
        compressed
      />
      <EuiSpacer />
      <EuiText>
        <p>{data}</p>
      </EuiText>
      {errors.length > 0 && (
        <EuiCallOut title="Sorry, there was an error" color="danger" iconType="alert">
          {errors.length === 1 ? (
            <p>{errors[0]}</p>
          ) : (
            <ul>
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}{' '}
        </EuiCallOut>
      )}
    </Page>
  );
};
