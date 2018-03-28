import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { PanelHeader } from './panel_header';
import { PanelError } from './panel_error';
import { EmbeddableViewportContainer } from './embeddable_viewport_container';

export class DashboardPanel extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    if (!this.props.initialized) {
      this.props.initializeEmbeddable();
    }
  }

  componentWillUnmount() {
    this.props.destroy();
  }

  onFocus = () => {
    const { onPanelFocused, panelId } = this.props;
    if (onPanelFocused) {
      onPanelFocused(panelId);
    }
  };

  onBlur = () => {
    const { onPanelBlurred, panelId } = this.props;
    if (onPanelBlurred) {
      onPanelBlurred(panelId);
    }
  };

  renderEmbeddableViewport() {
    return (
      <EmbeddableViewportContainer panelId={this.props.panelId} />
    );
  }

  renderEmbeddedError() {
    return <PanelError error={this.props.error} />;
  }

  renderLoader() {
    return <div>Loading...</div>;
  }

  renderContent() {
    const { error, initialized } = this.props;
    if (error) {
      return this.renderEmbeddedError();
    } else if (!initialized) {
      return this.renderLoader();
    } else {
      return this.renderEmbeddableViewport();
    }
  }

  render() {
    const { viewOnlyMode, panelId } = this.props;
    const classes = classNames('panel panel-default', this.props.className, {
      'panel--edit-mode': !viewOnlyMode
    });
    return (
      <div
        className="dashboard-panel"
        onFocus={this.onFocus}
        onBlur={this.onBlur}
      >
        <div
          className={classes}
          data-test-subj="dashboardPanel"
        >
          <PanelHeader
            panelId={panelId}
          />

          {this.renderContent()}

        </div>
      </div>
    );
  }
}

DashboardPanel.propTypes = {
  viewOnlyMode: PropTypes.bool.isRequired,
  onPanelFocused: PropTypes.func,
  onPanelBlurred: PropTypes.func,
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  panelId: PropTypes.string,
  initializeEmbeddable: PropTypes.func,
  initialized: PropTypes.bool,
  destroy: PropTypes.func.isRequired,
};
