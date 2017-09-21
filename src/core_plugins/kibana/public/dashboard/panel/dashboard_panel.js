import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { PanelHeader } from './panel_header';

export class DashboardPanel extends React.Component {

  constructor(props) {
    super(props);
    this.parentNode = null;
  }

  async componentDidMount() {
    this.props.renderEmbeddable(this.panelElement);
  }

  getParentNode() {
    if (!this.parentNode) {
      this.parentNode = ReactDOM.findDOMNode(this).parentNode;
    }
    return this.parentNode;
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

  /**
   * Setting the zIndex on onFocus and onBlur allows popups, like the panel menu, to appear above other panels in the
   * grid.
   */
  onFocus = () => {
    this.getParentNode().style.zIndex = 1;
  };
  onBlur = () => {
    this.getParentNode().style.zIndex = 'auto';
  };

  componentWillUnmount() {
    this.props.onDestroy();
  }

  render() {
    const { viewOnlyMode, isExpanded, title } = this.props;
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
          <div
            id="embeddedPanel"
            className="panel-content"
            ref={panelElement => this.panelElement = panelElement}
          />
        </div>
      </div>
    );
  }
}

DashboardPanel.propTypes = {
  renderEmbeddable: PropTypes.func.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onMaximizePanel: PropTypes.func.isRequired,
  onMinimizePanel: PropTypes.func.isRequired,
  onDeletePanel: PropTypes.func,
  editUrl: PropTypes.string,
  title: PropTypes.string,
  viewOnlyMode: PropTypes.bool.isRequired,
  onDestroy: PropTypes.func.isRequired
};
