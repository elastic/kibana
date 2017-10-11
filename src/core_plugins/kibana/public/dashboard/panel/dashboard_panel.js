import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { PanelHeader } from './panel_header';
import { PanelError } from './panel_error';

export class DashboardPanel extends React.Component {
  async componentDidMount() {
    this.props.renderEmbeddable(this.panelElement);
  }

  toggleExpandedPanel = () => {
    const { isExpanded, onMaximizePanel, onMinimizePanel } = this.props;
    if (isExpanded) {
      onMinimizePanel();
    } else {
      onMaximizePanel();
    }
  };

  deletePanel = () => this.props.onDeletePanel();

  onEditPanel = () => window.location = this.props.editUrl;

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
    const { error } = this.props;
    const errorMessage = error.message || JSON.stringify(error);
    return <PanelError error={errorMessage} />;
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
    const { viewOnlyMode, isExpanded, title, error } = this.props;
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
            title={title}
            onDeletePanel={this.deletePanel}
            onEditPanel={this.onEditPanel}
            onToggleExpand={this.toggleExpandedPanel}
            isExpanded={isExpanded}
            isViewOnlyMode={viewOnlyMode}
          />

          {error ? this.renderEmbeddedError() : this.renderEmbeddedContent()}

        </div>
      </div>
    );
  }
}

DashboardPanel.propTypes = {
  panelId: PropTypes.string.isRequired,
  renderEmbeddable: PropTypes.func.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onMaximizePanel: PropTypes.func.isRequired,
  onMinimizePanel: PropTypes.func.isRequired,
  viewOnlyMode: PropTypes.bool.isRequired,
  onDestroy: PropTypes.func.isRequired,
  onDeletePanel: PropTypes.func,
  editUrl: PropTypes.string,
  title: PropTypes.string,
  onPanelFocused: PropTypes.func,
  onPanelBlurred: PropTypes.func,
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
};
