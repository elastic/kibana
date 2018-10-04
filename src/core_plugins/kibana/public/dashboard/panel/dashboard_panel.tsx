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

import { EuiPanel } from '@elastic/eui';
import classNames from 'classnames';
import _ from 'lodash';
import { Component } from 'react';
import React from 'react';
import { ContainerState, Embeddable, EmbeddableFactory } from 'ui/embeddable';
import { EmbeddableActions, EmbeddableErrorAction } from '../actions';
import { PanelState } from '../selectors';
import { PanelError } from './panel_error';
import { PanelHeader } from './panel_header/panel_header';

interface DashboardPanelProps {
  viewOnlyMode: boolean;
  onPanelFocused: (panel: string) => {};
  onPanelBlurred: (panel: string) => {};
  error: string | object;
  destroy: () => void;
  containerState: ContainerState;
  embeddableFactory: EmbeddableFactory;
  embeddableStateChanged: (
    embeddableStateChanges: import('ui/embeddable/types').EmbeddableState
  ) => {};
  embeddableIsInitializing: EmbeddableActions;
  embeddableIsInitialized: (
    embeddableIsInitialized: import('ui/embeddable/embeddable').EmbeddableMetadata
  ) => void;
  embeddableError: EmbeddableErrorAction;
  initialized: boolean;
  panel: PanelState;
  isPopoverOpen: boolean;
  isLoading: boolean;
  calloutTitle: string;
  className: any;
}

interface State {
  error: string | null;
}

export class DashboardPanel extends Component<DashboardPanelProps, State> {
  [panel: string]: any;
  public mounted: boolean;
  public embeddable!: Embeddable;
  constructor(props: DashboardPanelProps) {
    super(props);
    this.state = {
      error: props.embeddableFactory ? null : `No factory found for embeddable`,
    };
    this.mounted = false;
  }

  public async componentDidMount() {
    this.mounted = true;
    const {
      initialized,
      embeddableFactory,
      panel,
      embeddableStateChanged,
      embeddableIsInitialized,
    } = this.props;
    if (!initialized) {
      embeddableFactory
        .create(panel, embeddableStateChanged)
        .then((embeddable: Embeddable) => {
          if (this.mounted) {
            this.embeddable = embeddable;
            embeddableIsInitialized(embeddable.metadata);
            this.embeddable.render(this.panelElement, this.props.containerState);
          } else {
            this.embeddable.destroy();
          }
        })
        .catch(error => {
          if (this.mounted) {
            this.embeddableError = error.message;
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
      return onPanelFocused(panel.panelIndex);
    }
  };

  public onBlur = () => {
    const { onPanelBlurred, panel } = this.props;
    if (onPanelBlurred) {
      return onPanelBlurred(panel.panelIndex);
    }
  };

  public renderEmbeddableViewport() {
    return (
      <div
        id="embeddedPanel"
        className="panel-content"
        ref={panelElement => (this.panelElement = panelElement)}
      >
        {!this.props.initialized && 'loading...'}
      </div>
    );
  }

  public shouldComponentUpdate(nextProps: {
    containerState: ContainerState;
    error: string | object;
    initialized: boolean;
  }) {
    if (this.embeddable && !_.isEqual(nextProps.containerState, this.props.containerState)) {
      this.embeddable.onContainerStateChanged(nextProps.containerState);
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
        <PanelHeader
          panelId={panel.panelIndex}
          embeddable={this.embeddable}
          isViewOnlyMode={this.viewOnlyMode}
          hidePanelTitles
        />

        {this.renderContent()}
      </EuiPanel>
    );
  }
}
