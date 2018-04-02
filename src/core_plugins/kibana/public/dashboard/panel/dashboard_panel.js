import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { PanelHeader } from './panel_header';
import { PanelError } from './panel_error';

export class DashboardPanel extends React.Component {
  async componentDidMount() {
    this.props.renderEmbeddable(this.panelElement);
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

  componentWillUnmount() {
    this.props.onDestroy();
  }

  renderEmbeddedContent() {
    return (
      <div
        id="embeddedPanel"
        className="panel-content"
        ref={panelElement => this.panelElement = panelElement}
      />
    );
  }

  renderEmbeddedError() {
    return <PanelError error={this.props.error} />;
  }

  render() {
    const { viewOnlyMode, error, panelId, embeddableFactory } = this.props;
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
            embeddableFactory={embeddableFactory}
            panelId={panelId}
          />

          {error ? this.renderEmbeddedError() : this.renderEmbeddedContent()}

        </div>
      </div>
    );
  }
}

DashboardPanel.propTypes = {
  panelId: PropTypes.string,
  renderEmbeddable: PropTypes.func.isRequired,
  viewOnlyMode: PropTypes.bool.isRequired,
  onDestroy: PropTypes.func.isRequired,
  onPanelFocused: PropTypes.func,
  onPanelBlurred: PropTypes.func,
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  embeddableFactory: PropTypes.object.isRequired,
};
