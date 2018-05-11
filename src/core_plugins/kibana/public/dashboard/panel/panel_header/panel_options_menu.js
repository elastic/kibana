import React from 'react';
import PropTypes from 'prop-types';

import { PanelOptionsMenuForm } from './panel_options_menu_form';

import {
  EuiContextMenu,
  EuiPopover,
  EuiIcon,
  EuiButtonIcon,
} from '@elastic/eui';

export class PanelOptionsMenu extends React.Component {
  state = {
    isPopoverOpen: false
  };

  toggleMenu = () => {
    this.setState({ isPopoverOpen: !this.state.isPopoverOpen });
  };
  closePopover = () => this.setState({ isPopoverOpen: false });

  onEditPanel = () => {
    window.location = this.props.editUrl;
  };

  onDeletePanel = () => {
    if (this.props.onDeletePanel) {
      this.props.onDeletePanel();
    }
  };

  onToggleExpandPanel = () => {
    this.closePopover();
    this.props.toggleExpandedPanel();
  };

  buildMainMenuPanel() {
    const { isExpanded } = this.props;
    const mainPanelMenuItems = [
      {
        name: 'Edit visualization',
        'data-test-subj': 'dashboardPanelEditLink',
        icon: <EuiIcon
          type="pencil"
        />,
        onClick: this.onEditPanel,
        disabled: !this.props.editUrl,
      },
      {
        name: 'Customize panel',
        'data-test-subj': 'dashboardPanelOptionsSubMenuLink',
        icon: <EuiIcon
          type="pencil"
        />,
        panel: 'panelSubOptionsMenu',
      },
      {
        name: isExpanded ? 'Minimize' : 'Full screen',
        'data-test-subj': 'dashboardPanelExpandIcon',
        icon: <EuiIcon
          type={isExpanded ? 'expand' : 'expand'}
        />,
        onClick: this.onToggleExpandPanel,
      }
    ];
    if (!this.props.isExpanded) {
      mainPanelMenuItems.push({
        name: 'Delete from dashboard',
        'data-test-subj': 'dashboardPanelRemoveIcon',
        icon: <EuiIcon
          type="trash"
        />,
        onClick: this.onDeletePanel,
      });
    }

    return {
      title: 'Options',
      id: 'mainMenu',
      items: mainPanelMenuItems,
    };
  }

  buildPanelOptionsSubMenu() {
    return {
      title: 'Customize panel',
      id: 'panelSubOptionsMenu',
      content: <PanelOptionsMenuForm
        onReset={this.props.onResetPanelTitle}
        onUpdatePanelTitle={this.props.onUpdatePanelTitle}
        title={this.props.panelTitle}
        onClose={this.closePopover}
      />,
    };
  }

  renderPanels() {
    return [
      this.buildMainMenuPanel(),
      this.buildPanelOptionsSubMenu(),
    ];
  }

  render() {
    const button = (
      <EuiButtonIcon
        iconType="gear"
        aria-label="Panel options"
        data-test-subj="dashboardPanelToggleMenuIcon"
        onClick={this.toggleMenu}
      />
    );

    return (
      <EuiPopover
        id="panelContextMenu"
        className="dashboardPanelPopOver"
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downRight"
        withTitle
      >
        <EuiContextMenu
          initialPanelId="mainMenu"
          panels={this.renderPanels()}
        />
      </EuiPopover>
    );
  }
}

PanelOptionsMenu.propTypes = {
  panelTitle: PropTypes.string,
  onUpdatePanelTitle: PropTypes.func.isRequired,
  onResetPanelTitle: PropTypes.func.isRequired,
  editUrl: PropTypes.string, // May be empty if the embeddable is still loading
  toggleExpandedPanel: PropTypes.func.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onDeletePanel: PropTypes.func, // Not available when the panel is expanded.
};
