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

import classNames from 'classnames';
import _ from 'lodash';
import React from 'react';

import { Action } from 'redux';
import {
  ContainerState,
  Embeddable,
  EmbeddableFactory,
  EmbeddableMetadata,
  EmbeddableState,
} from 'ui/embeddable';
import {
  EmbeddableErrorActionPayload,
  EmbeddableIsInitializedActionPayload,
} from '../actions';
import { EmbeddableError, PanelId, PanelState } from '../types';
import { PanelError } from './panel_error';
import { PanelHeader } from './panel_header';

export interface DashboardPanelProps {
  viewOnlyMode: boolean;
  error: EmbeddableError;
  initialized: boolean;
  panel: PanelState;
  panelId: PanelId;
  containerState: ContainerState;
  embeddableFactory: EmbeddableFactory;
  className?: string;
  onPanelFocused: (panelId: PanelId) => void;
  onPanelBlurred: (panelId: PanelId) => void;
  destroy: () => void;
  embeddableStateChanged: (embeddableState: EmbeddableState) => void;
  embeddableIsInitialized: (metadata: EmbeddableMetadata) => void;
  embeddableError: (errorMessage: string) => void;
  embeddableIsInitializing: () => void;
}

export class DashboardPanel extends React.Component<
  DashboardPanelProps,
  { error?: EmbeddableError }
> {
  private mounted: boolean = false;
  private embeddable?: Embeddable;
  private panelElement?: HTMLElement | null;

  constructor(props: DashboardPanelProps) {
    super(props);
    this.state = {
      error: props.embeddableFactory
        ? undefined
        : `No factory found for embeddable`,
    };
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
        .then(embeddable => {
          if (this.mounted) {
            this.embeddable = embeddable;
            embeddableIsInitialized(embeddable.metadata);
            if (this.panelElement) {
              this.embeddable.render(
                this.panelElement,
                this.props.containerState
              );
            }
          } else {
            embeddable.destroy();
          }
        })
        .catch(error => {
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

  public shouldComponentUpdate(nextProps: DashboardPanelProps) {
    if (
      this.embeddable &&
      !_.isEqual(nextProps.containerState, this.props.containerState)
    ) {
      this.embeddable.onContainerStateChanged(nextProps.containerState);
    }

    return (
      nextProps.error !== this.props.error ||
      nextProps.initialized !== this.props.initialized
    );
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
    const classes = classNames('panel panel-default', this.props.className, {
      'panel--edit-mode': !viewOnlyMode,
    });
    return (
      <div
        className="dashboard-panel"
        onFocus={this.onFocus}
        onBlur={this.onBlur}
      >
        <div className={classes} data-test-subj="dashboardPanel">
          <PanelHeader
            panelId={panel.panelIndex}
            embeddable={this.embeddable}
          />

          {this.renderContent()}
        </div>
      </div>
    );
  }
}
