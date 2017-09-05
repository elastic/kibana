import React from 'react';
import PropTypes from 'prop-types';
import { PanelMenuItem } from './panel_menu_item';
import {
  KuiPopover,
  KuiMenu,
  KuiKeyboardAccessible
} from 'ui_framework/components';

export class PanelOptionsMenu extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showMenu: false
    };
  }

  toggleMenu = () => {
    this.setState({ showMenu: !this.state.showMenu });
  };
  closeMenu = () => this.setState({ showMenu: false });

  getEditVisualizationMenuItem() {
    return (
      <PanelMenuItem
        onClick={this.props.onEditPanel}
        data-test-subj="dashboardPanelEditLink"
        label="Edit Visualization"
        iconClass="fa-edit"
      />
    );
  }

  getDeleteMenuItem() {
    return (
      <PanelMenuItem
        onClick={this.props.onDeletePanel}
        data-test-subj="dashboardPanelRemoveIcon"
        label="Delete from dashboard"
        iconClass="fa-trash"
      />
    );
  }

  getToggleExpandMenuItem() {
    return (
      <PanelMenuItem
        onClick={this.props.onToggleExpandPanel}
        data-test-subj="dashboardPanelExpandIcon"
        label={this.props.isExpanded ? 'Minimize' : 'Full screen'}
        iconClass={this.props.isExpanded ? 'fa-compress' : 'fa-expand'}
      />
    );
  }

  render() {
    return (
      <KuiPopover
        className="dashboardPanelPopOver"
        button={(
          <KuiKeyboardAccessible>
            <span
              aria-label="Click for more panel options"
              className="kuiButton__icon kuiIcon panel-dropdown fa fa-caret-down"
              data-test-subj="dashboardPanelToggleMenuIcon"
              onClick={this.toggleMenu}
            />
          </KuiKeyboardAccessible>
        )}
        isOpen={this.state.showMenu}
        anchorPosition="right"
        closePopover={this.closeMenu}
      >
        <KuiMenu>
          {this.getEditVisualizationMenuItem()}
          {this.getToggleExpandMenuItem()}
          {this.props.isExpanded ? null : this.getDeleteMenuItem()}
        </KuiMenu>
      </KuiPopover>
    );
  }
}

PanelOptionsMenu.propTypes = {
  onEditPanel: PropTypes.func.isRequired,
  onToggleExpandPanel:  PropTypes.func.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onDeletePanel: PropTypes.func, // Not available when the panel is expanded.
};
