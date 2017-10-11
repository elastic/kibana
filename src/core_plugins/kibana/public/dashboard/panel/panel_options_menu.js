import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiPopover,
  KuiContextMenuPanel,
  KuiContextMenuItem,
  KuiKeyboardAccessible,
} from 'ui_framework/components';

export class PanelOptionsMenu extends React.Component {
  state = {
    isPopoverOpen: false
  };

  toggleMenu = () => {
    this.setState({ isPopoverOpen: !this.state.isPopoverOpen });
  };

  closePopover = () => this.setState({ isPopoverOpen: false });

  renderItems() {
    const items = [(
      <KuiContextMenuItem
        key="0"
        data-test-subj="dashboardPanelEditLink"
        onClick={this.props.onEditPanel}
        icon={(
          <span
            aria-hidden="true"
            className="kuiButton__icon kuiIcon fa-edit"
          />
        )}
      >
        Edit Visualization
      </KuiContextMenuItem>
    ), (
      <KuiContextMenuItem
        key="1"
        data-test-subj="dashboardPanelExpandIcon"
        onClick={this.props.onToggleExpandPanel}
        icon={(
          <span
            aria-hidden="true"
            className={`kuiButton__icon kuiIcon ${this.props.isExpanded ? 'fa-compress' : 'fa-expand'}`}
          />
        )}
      >
        {this.props.isExpanded ? 'Minimize' : 'Full screen'}
      </KuiContextMenuItem>
    )];

    if (!this.props.isExpanded) {
      items.push(
        <KuiContextMenuItem
          key="2"
          data-test-subj="dashboardPanelRemoveIcon"
          onClick={this.props.onDeletePanel}
          icon={(
            <span
              aria-hidden="true"
              className="kuiButton__icon kuiIcon fa-trash"
            />
          )}
        >
          Delete from dashboard
        </KuiContextMenuItem>
      );
    }

    return items;
  }

  render() {
    const button = (
      <KuiKeyboardAccessible>
        <span
          aria-label="Click for more panel options"
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
  onEditPanel: PropTypes.func.isRequired,
  onToggleExpandPanel:  PropTypes.func.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onDeletePanel: PropTypes.func, // Not available when the panel is expanded.
};
