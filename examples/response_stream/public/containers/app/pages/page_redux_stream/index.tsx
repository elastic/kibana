/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, FC } from 'react';

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

import { cancelStream, startStream } from '@kbn/ml-response-stream/client';

import { RESPONSE_STREAM_API_ENDPOINT } from '../../../../../common/api';
import {
  setSimulateErrors,
  setCompressResponse,
  setFlushFix,
} from '../../../../../common/api/redux_stream/options_slice';
import { reset } from '../../../../../common/api/redux_stream/data_slice';

import { Page } from '../../../../components/page';
import { useDeps } from '../../../../hooks/use_deps';

import { BarChartRace } from '../../components/bar_chart_race';
import { getStatusMessage } from '../../components/get_status_message';

import { useAppDispatch, useAppSelector } from './hooks';

export const PageReduxStream: FC = () => {
  const {
    core: { http, notifications },
  } = useDeps();

  const dispatch = useAppDispatch();
  const { isRunning, isCancelled, errors: streamErrors } = useAppSelector((s) => s.stream);
  const { progress, entities, errors } = useAppSelector((s) => s.data);
  const { simulateErrors, compressResponse, flushFix } = useAppSelector((s) => s.options);

  const abortCtrl = useRef(new AbortController());

  const onClickHandler = async () => {
    if (isRunning) {
      abortCtrl.current.abort();
      dispatch(cancelStream());
    } else {
      abortCtrl.current = new AbortController();
      dispatch(reset());
      dispatch(
        startStream({
          http,
          endpoint: RESPONSE_STREAM_API_ENDPOINT.REDUX_STREAM,
          apiVersion: '1',
          abortCtrl,
          body: { compressResponse, flushFix, simulateErrors },
        })
      );
    }
  };

  // TODO This needs to be adapted as it might miss when error messages arrive
  // in bulk, but it should be good enough for this demo. This is for low level
  // errors on the HTTP level.Note this will only surface errors that happen for
  // the original request. Once the stream returns data, it will not be able to
  // return errors. This is why we need separate error handling for application
  // level errors.
  useEffect(() => {
    if (streamErrors.length > 0) {
      notifications.toasts.addDanger(streamErrors[streamErrors.length - 1]);
    }
  }, [streamErrors, notifications.toasts]);

  // TODO This approach needs to be adapted as it might miss when error messages arrive bulk.
  // This is for errors on the application level
  useEffect(() => {
    if (errors.length > 0) {
      notifications.toasts.addDanger(errors[errors.length - 1]);
    }
  }, [errors, notifications.toasts]);

  const buttonLabel = isRunning ? 'Stop development' : 'Start development';

  return (
    <Page title={'NDJSON Redux Toolkit stream'}>
      <EuiText>
        <p>
          This demonstrates integration of a single endpoint with streaming support with Redux
          Toolkit. The server and client share actions created via `createSlice`. The server sends a
          stream of NDJSON data to the client where each line is a redux action. The client then
          applies these actions to its state. The package `@kbn/ml-response-stream` exposes a slice
          of the state that can be used to start and cancel the stream. The `startStream` action is
          implemented as an async thunk that starts the stream and then dispatches received actions
          to the store. Hit &quot;Start development&quot; to trigger the bar chart race!
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
          onChange={(e) => dispatch(setSimulateErrors(!simulateErrors))}
        />
        <EuiCheckbox
          id="responseStreamCompressionCheckbox"
          label="Toggle compression setting for response stream."
          checked={compressResponse}
          onChange={(e) => dispatch(setCompressResponse(!compressResponse))}
        />
        <EuiCheckbox
          id="responseStreamFlushFixCheckbox"
          label="Toggle flushFix setting for response stream."
          checked={flushFix}
          onChange={(e) => dispatch(setFlushFix(!flushFix))}
        />
      </EuiText>
    </Page>
  );
};
