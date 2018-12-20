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

import React from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import classNames from 'classnames';
import _ from 'lodash';

import { PanelHeader } from './panel_header';
import { PanelError } from './panel_error';

import {
  EuiPanel,
} from '@elastic/eui';

class DashboardPanelUi extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: props.embeddableFactory ? null : props.intl.formatMessage({
        id: 'kbn.dashboard.panel.noEmbeddableFactoryErrorMessage',
        defaultMessage: 'No factory found for embeddable',
      }),
    };

    this.mounted = false;
  }

  async componentDidMount() {
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
      embeddableFactory.create(panel, embeddableStateChanged)
        .then((embeddable) => {
          if (this.mounted) {
            this.embeddable = embeddable;
            embeddableIsInitialized(embeddable.metadata);
            this.embeddable.render(this.panelElement, this.props.containerState);
          } else {
            embeddable.destroy();
          }
        })
        .catch((error) => {
          if (this.mounted) {
            embeddableError(error.message);
          }
        });
    }
  }

  componentWillUnmount() {
    this.props.destroy();
    this.mounted = false;
    if (this.embeddable) {
      this.embeddable.destroy();
    }
  }

  onFocus = () => {
    const { onPanelFocused, panel } = this.props;
    if (onPanelFocused) {
      onPanelFocused(panel.panelIndex);
    }
  };

  onBlur = () => {
    const { onPanelBlurred, panel } = this.props;
    if (onPanelBlurred) {
      onPanelBlurred(panel.panelIndex);
    }
  };

  renderEmbeddableViewport() {
    return (
      <div
        id="embeddedPanel"
        className="panel-content"
        ref={panelElement => this.panelElement = panelElement}
      >
        {!this.props.initialized && <FormattedMessage
          id="kbn.dashboard.panel.embeddableViewport.loadingLabel"
          defaultMessage="loading…"
        />}
      </div>
    );
  }

  shouldComponentUpdate(nextProps) {
    if (this.embeddable && !_.isEqual(nextProps.containerState, this.props.containerState)) {
      this.embeddable.onContainerStateChanged(nextProps.containerState);
    }

    if (this.embeddable && nextProps.lastReloadRequestTime !== this.props.lastReloadRequestTime) {
      this.embeddable.reload();
    }

    return nextProps.error !== this.props.error ||
      nextProps.initialized !== this.props.initialized;
  }

  renderEmbeddedError() {
    return <PanelError error={this.props.error} />;
  }

  renderContent() {
    const { error } = this.props;
    if (error) {
      return this.renderEmbeddedError(error);
    } else {
      return this.renderEmbeddableViewport();
    }
  }

  render() {
    const { viewOnlyMode, panel } = this.props;
    const classes = classNames('dshPanel', this.props.className, {
      'dshPanel--editing': !viewOnlyMode
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
        />

        {this.renderContent()}
      </EuiPanel>
    );
  }
}

DashboardPanelUi.propTypes = {
  viewOnlyMode: PropTypes.bool.isRequired,
  onPanelFocused: PropTypes.func,
  onPanelBlurred: PropTypes.func,
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  destroy: PropTypes.func.isRequired,
  containerState: PropTypes.shape({
    timeRange: PropTypes.object,
    filters: PropTypes.array,
    query: PropTypes.object,
    embeddableCustomization: PropTypes.object,
    hidePanelTitles: PropTypes.bool.isRequired,
  }),
  embeddableFactory: PropTypes.shape({
    create: PropTypes.func,
  }).isRequired,
  lastReloadRequestTime: PropTypes.number.isRequired,
  embeddableStateChanged: PropTypes.func.isRequired,
  embeddableIsInitialized: PropTypes.func.isRequired,
  embeddableError: PropTypes.func.isRequired,
  embeddableIsInitializing: PropTypes.func.isRequired,
  initialized: PropTypes.bool.isRequired,
  panel: PropTypes.shape({
    panelIndex: PropTypes.string,
  }).isRequired,
};

export const DashboardPanel = injectI18n(DashboardPanelUi);
