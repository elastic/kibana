/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState, FC } from 'react';

import {
  EuiBadge,
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { useFetchStream } from '@kbn/ml-response-stream/client';

import { getInitialState } from '../../../../../common/api/stream_state';
import {
  resetStream,
  reducerStreamReducer,
} from '../../../../../common/api/reducer_stream/reducer';
import { RESPONSE_STREAM_API_ENDPOINT } from '../../../../../common/api';

import { Page } from '../../../../components/page';

import { useDeps } from '../../../../hooks/use_deps';

import { BarChartRace } from '../../components/bar_chart_race';
import { getStatusMessage } from '../../components/get_status_message';

const initialState = getInitialState();

export const PageReducerStream: FC = () => {
  const {
    core: { http, notifications },
  } = useDeps();

  const [simulateErrors, setSimulateErrors] = useState(false);
  const [compressResponse, setCompressResponse] = useState(true);
  const [flushFix, setFlushFix] = useState(false);

  const { dispatch, start, cancel, data, errors, isCancelled, isRunning } = useFetchStream(
    http,
    RESPONSE_STREAM_API_ENDPOINT.REDUCER_STREAM,
    '1',
    { compressResponse, flushFix, simulateErrors },
    { reducer: reducerStreamReducer, initialState }
  );

  const { progress, entities } = data;

  const onClickHandler = async () => {
    if (isRunning) {
      cancel();
    } else {
      dispatch(resetStream());
      start();
    }
  };

  // TODO This needs to be adapted as it might miss when error messages arrive
  // in bulk, but it should be good enough for this demo. This is for low level
  // errors on the HTTP level.Note this will only surface errors that happen for
  // the original request. Once the stream returns data, it will not be able to
  // return errors. This is why we need separate error handling for application
  // level errors.
  useEffect(() => {
    if (errors.length > 0) {
      notifications.toasts.addDanger(errors[errors.length - 1]);
    }
  }, [errors, notifications.toasts]);

  // TODO This approach needs to be adapted as it might miss when error messages arrive bulk.
  // This is for errors on the application level
  useEffect(() => {
    if (data.errors.length > 0) {
      notifications.toasts.addDanger(data.errors[data.errors.length - 1]);
    }
  }, [data.errors, notifications.toasts]);

  const buttonLabel = isRunning ? 'Stop development' : 'Start development';

  return (
    <Page title={'NDJSON useReducer stream'}>
      <EuiText>
        <p>
          This demonstrates a single endpoint with streaming support that sends old school Redux
          inspired actions from server to client. The server and client share types of the data to
          be received. The client uses a custom hook that receives stream chunks and passes them on
          to `useReducer()` that acts on the actions it receives. The custom hook includes code to
          buffer actions and is able to apply them in bulk so the DOM does not get hammered with
          updates. Hit &quot;Start development&quot; to trigger the bar chart race!
        </p>
      </EuiText>
      <br />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="responseStreamStartButton"
            color="primary"
            size="s"
            onClick={onClickHandler}
            aria-label={buttonLabel}
          >
            {buttonLabel}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <EuiBadge data-test-subj="responseStreamProgressBadge">{progress}%</EuiBadge>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiProgress value={progress} max={100} size="xs" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <BarChartRace entities={entities} />
      <EuiText>
        <p data-test-subj="responseStreamStatusMessage">
          {getStatusMessage(isRunning, isCancelled, progress)}
        </p>
        <EuiCheckbox
          id="responseStreamSimulateErrorsCheckbox"
          label="Simulate errors (gets applied to new streams only, not currently running ones)."
          checked={simulateErrors}
          onChange={(e) => setSimulateErrors(!simulateErrors)}
          compressed
        />
        <EuiCheckbox
          id="responseStreamCompressionCheckbox"
          label="Toggle compression setting for response stream."
          checked={compressResponse}
          onChange={(e) => setCompressResponse(!compressResponse)}
          compressed
        />
        <EuiCheckbox
          id="responseStreamFlushFixCheckbox"
          label="Toggle flushFix setting for response stream."
          checked={flushFix}
          onChange={(e) => setFlushFix(!flushFix)}
          compressed
        />
      </EuiText>
    </Page>
  );
};
