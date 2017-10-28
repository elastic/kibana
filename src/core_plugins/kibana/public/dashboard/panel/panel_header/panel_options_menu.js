import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiPopover,
  KuiContextMenuPanel,
  KuiKeyboardAccessible,
} from 'ui_framework/components';

import { EditMenuItem } from './edit_menu_item';
import { DeleteMenuItem } from './delete_menu_item';
import { ExpandOrCollapseMenuItem } from './expand_or_collapse_menu_item';

export class PanelOptionsMenu extends React.Component {
  state = {
    isPopoverOpen: false
  };

  toggleMenu = () => {
    this.setState({ isPopoverOpen: !this.state.isPopoverOpen });
  };
  closePopover = () => this.setState({ isPopoverOpen: false });

  onEditPanel = () => {
    this.closePopover();
    window.location = this.props.editUrl;
  };

  onDeletePanel = () => {
    this.closePopover();

    if (this.props.onDeletePanel) {
      this.props.onDeletePanel();
    }
  };

  onToggleExpandPanel = () => {
    this.closePopover();
    this.props.toggleExpandedPanel();
  };

  renderItems() {
    const items = [
      <EditMenuItem
        key="0"
        onEditPanel={this.onEditPanel}
      />,
      <ExpandOrCollapseMenuItem
        key="2"
        onToggleExpand={this.onToggleExpandPanel}
        isExpanded={this.props.isExpanded}
      />
    ];
    if (!this.props.isExpanded) {
      items.push(<DeleteMenuItem key="3" onDeletePanel={this.onDeletePanel} />);
    }

    return items;
  }

  render() {
    const button = (
      <KuiKeyboardAccessible>
        <span
          aria-label="Panel options"
          className="kuiButton__icon kuiIcon panel-dropdown fa fa-caret-down"
          data-test-subj="dashboardPanelToggleMenuIcon"
          onClick={this.toggleMenu}
        />
      </KuiKeyboardAccessible>
    );

    return (
      <KuiPopover
        className="dashboardPanelPopOver"
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="right"
      >
        <KuiContextMenuPanel
          onClose={this.closePopover}
          items={this.renderItems()}
        />
      </KuiPopover>
    );
  }
}

PanelOptionsMenu.propTypes = {
  editUrl: PropTypes.string.isRequired,
  toggleExpandedPanel: PropTypes.func.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onDeletePanel: PropTypes.func, // Not available when the panel is expanded.
};
