/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState, FC } from 'react';

import { Chart, Settings, Axis, BarSeries, Position, ScaleType } from '@elastic/charts';

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

import { useFetchStream } from '@kbn/aiops-utils';

import { ApiReducerStream } from '../../../../../common/api';
import {
  initialState,
  resetStream,
  reducerStreamReducer,
} from '../../../../../common/api/reducer_stream/reducer';

import { Page } from '../../../../components/page';

import { useDeps } from '../../../../hooks/use_deps';

import { getStatusMessage } from './get_status_message';

export const PageReducerStream: FC = () => {
  const {
    core: { http, notifications },
  } = useDeps();

  const basePath = http?.basePath.get() ?? '';

  const [simulateErrors, setSimulateErrors] = useState(false);
  const [compressResponse, setCompressResponse] = useState(true);

  const { dispatch, start, cancel, data, errors, isCancelled, isRunning } = useFetchStream<
    ApiReducerStream,
    typeof basePath
  >(
    `${basePath}/internal/response_stream/reducer_stream`,
    { compressResponse, simulateErrors },
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

  // TODO This approach needs to be adapted as it might miss when error messages arrive bulk.
  // This is for low level errors on the stream/HTTP level.
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
    <Page title={'Reducer stream'}>
      <EuiText>
        <p>
          This demonstrates a single endpoint with streaming support that sends Redux inspired
          actions from server to client. The server and client share types of the data to be
          received. The client uses a custom hook that receives stream chunks and passes them on to
          `useReducer()` that acts on the Redux type actions it receives. The custom hook includes
          code to buffer actions and is able to apply them in bulk so the DOM does not get hammered
          with updates. Hit &quot;Start development&quot; to trigger the bar chart race!
        </p>
      </EuiText>
      <br />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton type="primary" size="s" onClick={onClickHandler} aria-label={buttonLabel}>
            {buttonLabel}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <EuiBadge>{progress}%</EuiBadge>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiProgress value={progress} max={100} size="xs" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <div style={{ height: '300px' }}>
        <Chart>
          <Settings rotation={90} />
          <Axis id="entities" position={Position.Bottom} title="Commits" showOverlappingTicks />
          <Axis id="left2" title="Developers" position={Position.Left} />

          <BarSeries
            id="commits"
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            data={Object.entries(entities)
              .map(([x, y]) => {
                return {
                  x,
                  y,
                };
              })
              .sort((a, b) => b.y - a.y)}
          />
        </Chart>
      </div>
      <EuiText>
        <p>{getStatusMessage(isRunning, isCancelled, data.progress)}</p>
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
      </EuiText>
    </Page>
  );
};
