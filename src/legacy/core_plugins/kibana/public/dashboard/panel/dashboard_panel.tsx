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

import { EuiLoadingChart, EuiPanel } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import classNames from 'classnames';
import _ from 'lodash';
import React from 'react';
import {
  ContainerState,
  Embeddable,
  EmbeddableFactory,
  EmbeddableMetadata,
  EmbeddableState,
} from 'ui/embeddable';
import { EmbeddableErrorAction } from '../actions';
import { PanelId } from '../selectors';
import { PanelError } from './panel_error';
import { PanelHeader } from './panel_header';
import { SavedDashboardPanel } from '../types';

export interface DashboardPanelProps {
  viewOnlyMode: boolean;
  onPanelFocused?: (panelIndex: PanelId) => void;
  onPanelBlurred?: (panelIndex: PanelId) => void;
  error?: string | object;
  destroy: () => void;
  containerState: ContainerState;
  embeddableFactory: EmbeddableFactory;
  lastReloadRequestTime?: number;
  embeddableStateChanged: (embeddableStateChanges: EmbeddableState) => void;
  embeddableIsInitialized: (embeddableIsInitializing: EmbeddableMetadata) => void;
  embeddableError: (errorMessage: EmbeddableErrorAction) => void;
  embeddableIsInitializing: () => void;
  initialized: boolean;
  panel: SavedDashboardPanel;
  className?: string;
}

export interface DashboardPanelUiProps extends DashboardPanelProps {
  intl: InjectedIntl;
}

interface State {
  error: string | null;
}

class DashboardPanelUi extends React.Component<DashboardPanelUiProps, State> {
  [panel: string]: any;
  public mounted: boolean;
  public embeddable!: Embeddable;
  constructor(props: DashboardPanelUiProps) {
    super(props);
    this.state = {
      error: props.embeddableFactory
        ? null
        : props.intl.formatMessage({
            id: 'kbn.dashboard.panel.noEmbeddableFactoryErrorMessage',
            defaultMessage: 'The feature to render this panel is missing.',
          }),
    };

    this.mounted = false;
  }

  public async componentDidMount() {
    this.mounted = true;
    const {
      initialized,
      embeddableFactory,
      embeddableIsInitializing,
      panel,
      embeddableStateChanged,
      embeddableIsInitialized,
      embeddableError,
    } = this.props;

    if (!initialized) {
      embeddableIsInitializing();
      embeddableFactory
        .create(panel, embeddableStateChanged)
        .then((embeddable: Embeddable) => {
          if (this.mounted) {
            this.embeddable = embeddable;
            embeddableIsInitialized(embeddable.metadata);
            this.embeddable.render(this.panelElement, this.props.containerState);
          } else {
            embeddable.destroy();
          }
        })
        .catch((error: { message: EmbeddableErrorAction }) => {
          if (this.mounted) {
            embeddableError(error.message);
          }
        });
    }
  }

  public componentWillUnmount() {
    this.props.destroy();
    this.mounted = false;
    if (this.embeddable) {
      this.embeddable.destroy();
    }
  }

  public onFocus = () => {
    const { onPanelFocused, panel } = this.props;
    if (onPanelFocused) {
      onPanelFocused(panel.panelIndex);
    }
  };

  public onBlur = () => {
    const { onPanelBlurred, panel } = this.props;
    if (onPanelBlurred) {
      onPanelBlurred(panel.panelIndex);
    }
  };

  public renderEmbeddableViewport() {
    const classes = classNames('panel-content', {
      'panel-content-isLoading': !this.props.initialized,
    });

    return (
      <div
        id="embeddedPanel"
        className={classes}
        ref={panelElement => (this.panelElement = panelElement)}
      >
        {!this.props.initialized && <EuiLoadingChart size="l" mono />}
      </div>
    );
  }

  public shouldComponentUpdate(nextProps: DashboardPanelUiProps) {
    if (this.embeddable && !_.isEqual(nextProps.containerState, this.props.containerState)) {
      this.embeddable.onContainerStateChanged(nextProps.containerState);
    }

    if (this.embeddable && nextProps.lastReloadRequestTime !== this.props.lastReloadRequestTime) {
      this.embeddable.reload();
    }

    return nextProps.error !== this.props.error || nextProps.initialized !== this.props.initialized;
  }

  public renderEmbeddedError() {
    return <PanelError error={this.props.error} />;
  }

  public renderContent() {
    const { error } = this.props;
    if (error) {
      return this.renderEmbeddedError();
    } else {
      return this.renderEmbeddableViewport();
    }
  }

  public render() {
    const { viewOnlyMode, panel } = this.props;
    const classes = classNames('dshPanel', this.props.className, {
      'dshPanel--editing': !viewOnlyMode,
    });
    return (
      <EuiPanel
        className={classes}
        data-test-subj="dashboardPanel"
        onFocus={this.onFocus}
        onBlur={this.onBlur}
        paddingSize="none"
      >
        <PanelHeader panelId={panel.panelIndex} embeddable={this.embeddable} />

        {this.renderContent()}
      </EuiPanel>
    );
  }
}

export const DashboardPanel = injectI18n(DashboardPanelUi);
