import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiPopover,
  KuiContextMenu,
  KuiKeyboardAccessible,
} from '@kbn/ui-framework/components';

export function PanelOptionsMenu({ toggleContextMenu, isPopoverOpen, closeContextMenu, panels }) {
  const button = (
    <KuiKeyboardAccessible>
      <span
        aria-label="Panel options"
        className="kuiButton__icon kuiIcon panel-dropdown fa fa-gear"
        data-test-subj="dashboardPanelToggleMenuIcon"
        onClick={toggleContextMenu}
      />
    </KuiKeyboardAccessible>
  );

  return (
    <KuiPopover
      className="dashboardPanelPopOver"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closeContextMenu}
      panelPaddingSize="none"
      anchorPosition="right"
      withTitle
    >
      <KuiContextMenu
        initialPanelId="mainMenu"
        panels={panels}
      />
    </KuiPopover>
  );
}

PanelOptionsMenu.propTypes = {
  panels: PropTypes.array,
  toggleContextMenu: PropTypes.func,
  closeContextMenu: PropTypes.func,
  isPopoverOpen: PropTypes.bool,
};
