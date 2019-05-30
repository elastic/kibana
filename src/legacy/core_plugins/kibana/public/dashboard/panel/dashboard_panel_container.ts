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

import { i18n } from '@kbn/i18n';
import { connect } from 'react-redux';
import { Action } from 'redux-actions';
import { ThunkDispatch } from 'redux-thunk';
import {
  ContainerState,
  EmbeddableFactory,
  EmbeddableMetadata,
  EmbeddableState,
} from 'ui/embeddable';
import { CoreKibanaState } from '../../selectors';
import {
  deletePanel,
  embeddableError,
  EmbeddableErrorAction,
  embeddableIsInitialized,
  embeddableIsInitializing,
  embeddableStateChanged,
} from '../actions';
import { DashboardViewMode } from '../dashboard_view_mode';
import {
  getContainerState,
  getEmbeddable,
  getEmbeddableError,
  getEmbeddableInitialized,
  getFullScreenMode,
  getPanel,
  getPanelType,
  getViewMode,
  PanelId,
} from '../selectors';
import { DashboardPanel } from './dashboard_panel';
import { SavedDashboardPanel } from '../types';

export interface DashboardPanelContainerOwnProps {
  panelId: PanelId;
  embeddableFactory: EmbeddableFactory;
}

interface DashboardPanelContainerStateProps {
  error?: string | object;
  viewOnlyMode: boolean;
  containerState: ContainerState;
  initialized: boolean;
  panel: SavedDashboardPanel;
  lastReloadRequestTime?: number;
}

export interface DashboardPanelContainerDispatchProps {
  destroy: () => void;
  embeddableIsInitializing: () => void;
  embeddableIsInitialized: (metadata: EmbeddableMetadata) => void;
  embeddableStateChanged: (embeddableState: EmbeddableState) => void;
  embeddableError: (errorMessage: EmbeddableErrorAction) => void;
}

const mapStateToProps = (
  { dashboard }: CoreKibanaState,
  { embeddableFactory, panelId }: DashboardPanelContainerOwnProps
) => {
  const embeddable = getEmbeddable(dashboard, panelId);
  let error = null;
  if (!embeddableFactory) {
    const panelType = getPanelType(dashboard, panelId);
    error = i18n.translate('kbn.dashboard.panel.noFoundEmbeddableFactoryErrorMessage', {
      defaultMessage: 'No embeddable factory found for panel type {panelType}',
      values: { panelType },
    });
  } else {
    error = (embeddable && getEmbeddableError(dashboard, panelId)) || '';
  }
  const lastReloadRequestTime = embeddable ? embeddable.lastReloadRequestTime : 0;
  const initialized = embeddable ? getEmbeddableInitialized(dashboard, panelId) : false;
  return {
    error,
    viewOnlyMode: getFullScreenMode(dashboard) || getViewMode(dashboard) === DashboardViewMode.VIEW,
    containerState: getContainerState(dashboard, panelId),
    initialized,
    panel: getPanel(dashboard, panelId),
    lastReloadRequestTime,
  };
};

const mapDispatchToProps = (
  dispatch: ThunkDispatch<CoreKibanaState, {}, Action<any>>,
  { panelId }: DashboardPanelContainerOwnProps
): DashboardPanelContainerDispatchProps => ({
  destroy: () => dispatch(deletePanel(panelId)),
  embeddableIsInitializing: () => dispatch(embeddableIsInitializing(panelId)),
  embeddableIsInitialized: (metadata: EmbeddableMetadata) =>
    dispatch(embeddableIsInitialized({ panelId, metadata })),
  embeddableStateChanged: (embeddableState: EmbeddableState) =>
    dispatch(embeddableStateChanged({ panelId, embeddableState })),
  embeddableError: (errorMessage: EmbeddableErrorAction) =>
    dispatch(embeddableError({ panelId, error: errorMessage })),
});

export const DashboardPanelContainer = connect<
  DashboardPanelContainerStateProps,
  DashboardPanelContainerDispatchProps,
  DashboardPanelContainerOwnProps,
  CoreKibanaState
>(
  mapStateToProps,
  mapDispatchToProps
)(DashboardPanel);
