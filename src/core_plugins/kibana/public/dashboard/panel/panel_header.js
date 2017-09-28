import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { PanelOptionsMenu } from './panel_options_menu';

export class PanelHeader extends React.Component {

  renderOptionsDropDown() {
    return (
      <PanelOptionsMenu
        onEditPanel={this.props.onEditPanel}
        onDeletePanel={this.props.onDeletePanel}
        onToggleExpandPanel={this.props.onToggleExpand}
        isExpanded={this.props.isExpanded}
      />
    );
  }

  renderExpandToggle() {
    const { isExpanded } = this.props;
    const classes = classNames('kuiIcon', { 'fa-expand': !isExpanded, 'fa-compress': isExpanded });
    const ariaLabel = isExpanded ? 'Minimize panel' : 'Maximize panel';
    return (
      <button
        className="kuiMicroButton"
        aria-label={ariaLabel}
        data-test-subj="dashboardPanelExpandIcon"
        onClick={this.props.onToggleExpand}
      >
        <span
          aria-hidden="true"
          className={classes}
        />
      </button>
    );
  }

  render() {
    return (
      <div className="panel-heading">
        <span
          data-test-subj="dashboardPanelTitle"
          className="panel-title"
          aria-label={`Dashboard panel: ${this.props.title}`}
        >
          {this.props.title}
        </span>

        <div className="kuiMicroButtonGroup">
          {this.props.isViewOnlyMode ? this.renderExpandToggle() : this.renderOptionsDropDown()}
        </div>
      </div>
    );
  }
}

PanelHeader.propTypes = {
  title: PropTypes.string,
  onEditPanel: PropTypes.func.isRequired,
  onDeletePanel: PropTypes.func.isRequired,
  onToggleExpand: PropTypes.func.isRequired,
  isExpanded: PropTypes.bool.isRequired
};
