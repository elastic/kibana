/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState, FC } from 'react';

import {
  Chart,
  Settings,
  Axis,
  BarSeries,
  Position,
  ScaleType,
  LEGACY_LIGHT_THEME,
} from '@elastic/charts';

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
import { reset } from '../../../../../common/api/redux_stream/dev_stream_slice';

import { Page } from '../../../../components/page';
import { useDeps } from '../../../../hooks/use_deps';

import { getStatusMessage } from '../../components/get_status_message';

import { useAppDispatch, useAppSelector } from './hooks';

export const PageReduxStream: FC = () => {
  const {
    core: { http, notifications },
  } = useDeps();

  const [simulateErrors, setSimulateErrors] = useState(false);
  const [compressResponse, setCompressResponse] = useState(true);
  const [flushFix, setFlushFix] = useState(false);

  const dispatch = useAppDispatch();
  const isRunning = useAppSelector((s) => s.stream.isRunning);
  const isCancelled = useAppSelector((s) => s.stream.isCancelled);
  const errors = useAppSelector((s) => s.stream.errors);
  const progress = useAppSelector((s) => s.dev.progress);
  const entities = useAppSelector((s) => s.dev.entities);

  const abortCtrl = useRef(new AbortController());

  const onClickHandler = async () => {
    if (isRunning) {
      dispatch(cancelStream());
    } else {
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
    if (errors.length > 0) {
      notifications.toasts.addDanger(errors[errors.length - 1]);
    }
  }, [errors, notifications.toasts]);

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
          <EuiButton color="primary" size="s" onClick={onClickHandler} aria-label={buttonLabel}>
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
          <Settings
            // TODO connect to charts.theme service see src/plugins/charts/public/services/theme/README.md
            baseTheme={LEGACY_LIGHT_THEME}
            rotation={90}
          />
          <Axis id="entities" position={Position.Bottom} title="Commits" showOverlappingTicks />
          <Axis id="left2" title="Developers" position={Position.Left} />

          <BarSeries
            id="commits"
            xScaleType={ScaleType.Ordinal}
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
        <p>{getStatusMessage(isRunning, isCancelled, progress)}</p>
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
