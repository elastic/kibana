import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiContextMenu,
  EuiPopover,
  EuiButtonIcon,
} from '@elastic/eui';

export function PanelOptionsMenu({ toggleContextMenu, isPopoverOpen, closeContextMenu, panels }) {
  const button = (
    <EuiButtonIcon
      iconType="gear"
      aria-label="Panel options"
      data-test-subj="dashboardPanelToggleMenuIcon"
      onClick={toggleContextMenu}
    />
  );

  return (
    <EuiPopover
      id="dashboardPanelContextMenu"
      className="dashboardPanelPopOver"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closeContextMenu}
      panelPaddingSize="none"
      anchorPosition="downRight"
      withTitle
    >
      <EuiContextMenu
        initialPanelId="mainMenu"
        panels={panels}
      />
    </EuiPopover>
  );
}

PanelOptionsMenu.propTypes = {
  panels: PropTypes.array,
  toggleContextMenu: PropTypes.func,
  closeContextMenu: PropTypes.func,
  isPopoverOpen: PropTypes.bool,
};
