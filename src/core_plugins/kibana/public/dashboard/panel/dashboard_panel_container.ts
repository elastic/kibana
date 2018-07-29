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

import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { Dispatch } from 'redux';

import {
  ContainerState,
  EmbeddableFactory,
  EmbeddableMetadata,
  EmbeddableState,
} from 'ui/embeddable';

import { DashboardViewMode } from '../dashboard_view_mode';
import { DashboardPanel } from './dashboard_panel';

import {
  deletePanel,
  embeddableError,
  embeddableIsInitialized,
  embeddableIsInitializing,
  embeddableStateChanged,
} from '../actions';

import { CoreKibanaState } from '../../selectors';
import {
  getContainerState,
  getEmbeddable,
  getEmbeddableError,
  getEmbeddableInitialized,
  getFullScreenMode,
  getPanel,
  getPanelType,
  getViewMode,
} from '../selectors';
import { EmbeddableError, PanelId, PanelState } from '../types';

interface DashboardPanelStateProps {
  containerState: ContainerState;
  error: EmbeddableError;
  initialized: boolean;
  panel: PanelState;
  viewOnlyMode: boolean;
}

const mapStateToProps = (
  state: CoreKibanaState,
  ownProps: DashboardPanelOwnProps
): DashboardPanelStateProps => {
  const { dashboard } = state;
  const { embeddableFactory, panelId } = ownProps;
  const embeddable = getEmbeddable(dashboard, panelId);
  let error: EmbeddableError;
  if (!embeddableFactory) {
    const panelType = getPanelType(dashboard, panelId);
    error = `No embeddable factory found for panel type ${panelType}`;
  } else {
    error = (embeddable && getEmbeddableError(dashboard, panelId)) || '';
  }
  const initialized = embeddable
    ? getEmbeddableInitialized(dashboard, panelId)
    : false;
  return {
    containerState: getContainerState(dashboard, panelId),
    error,
    initialized,
    panel: getPanel(dashboard, panelId),
    viewOnlyMode:
      getFullScreenMode(dashboard) ||
      getViewMode(dashboard) === DashboardViewMode.VIEW,
  };
};

interface DashboardPanelDispatchProps {
  destroy: () => void;
  embeddableStateChanged: (embeddableState: EmbeddableState) => void;
  embeddableIsInitialized: (metadata: EmbeddableMetadata) => void;
  embeddableError: (errorMessage: string) => void;
  embeddableIsInitializing: () => void;
}

const mapDispatchToProps = (
  dispatch: Dispatch<CoreKibanaState>,
  ownProps: DashboardPanelOwnProps
): DashboardPanelDispatchProps => ({
  destroy: () => {
    dispatch(deletePanel(ownProps.panelId));
  },
  embeddableError: (errorMessage: string) => {
    dispatch(
      embeddableError({ panelId: ownProps.panelId, error: errorMessage })
    );
  },
  embeddableIsInitialized: (metadata: EmbeddableMetadata) => {
    dispatch(embeddableIsInitialized({ panelId: ownProps.panelId, metadata }));
  },
  embeddableIsInitializing: () => {
    dispatch(embeddableIsInitializing(ownProps.panelId));
  },
  embeddableStateChanged: (embeddableState: EmbeddableState) => {
    dispatch(
      embeddableStateChanged({ panelId: ownProps.panelId, embeddableState })
    );
  },
});

export interface DashboardPanelOwnProps {
  embeddableFactory: EmbeddableFactory;
  panelId: PanelId;
  onPanelFocused: (panelId: PanelId) => void;
  onPanelBlurred: (panelId: PanelId) => void;
}

export const DashboardPanelContainer = connect<
  DashboardPanelStateProps,
  DashboardPanelDispatchProps,
  DashboardPanelOwnProps,
  CoreKibanaState
>(mapStateToProps, mapDispatchToProps)(DashboardPanel);
