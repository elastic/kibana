/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState, FC } from 'react';

import { Chart, Settings, Axis, BarSeries, Position, ScaleType } from '@elastic/charts';

import { i18n } from '@kbn/i18n';

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

import { useStreamFetchReducer } from '@kbn/aiops-plugin/public';

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
    core: { notifications },
  } = useDeps();

  const [simulateErrors, setSimulateErrors] = useState(false);

  const { dispatch, start, cancel, data, isCancelled, isRunning } =
    useStreamFetchReducer<ApiReducerStream>(
      '/internal/response_stream/reducer_stream',
      reducerStreamReducer,
      initialState,
      { simulateErrors }
    );

  const { errors, progress, entities } = data;

  const onClickHandler = async () => {
    if (isRunning) {
      cancel();
    } else {
      dispatch(resetStream());
      start();
    }
  };

  useEffect(() => {
    if (errors.length > 0) {
      notifications.toasts.addDanger(errors[errors.length - 1]);
    }
  }, [errors, notifications.toasts]);

  const buttonLabel = isRunning
    ? i18n.translate('xpack.response_stream.stopbuttonText', {
        defaultMessage: 'Stop development',
      })
    : i18n.translate('xpack.response_stream.startbuttonText', {
        defaultMessage: 'Start development',
      });

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
          <Axis
            id="entities"
            position={Position.Bottom}
            title={i18n.translate('xpack.response_stream.barChart.commitsTitle', {
              defaultMessage: 'Commits',
            })}
            showOverlappingTicks
          />
          <Axis
            id="left2"
            title={i18n.translate('xpack.response_stream.barChart.developersTitle', {
              defaultMessage: 'Developers',
            })}
            position={Position.Left}
          />

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
          label={i18n.translate('xpack.responseStream.simulateErrorsCheckboxLabel', {
            defaultMessage:
              'Simulate errors (gets applied to new streams only, not currently running ones).',
          })}
          checked={simulateErrors}
          onChange={(e) => setSimulateErrors(!simulateErrors)}
          compressed
        />
      </EuiText>
    </Page>
  );
};
