/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiContextMenu,
  EuiPopover,
  EuiButtonIcon,
} from '@elastic/eui';

export function PanelOptionsMenu({ toggleContextMenu, isPopoverOpen, closeContextMenu, panels, isViewMode }) {
  const button = (
    <EuiButtonIcon
      iconType={isViewMode ? 'boxesHorizontal' : 'gear'}
      color="text"
      className={isViewMode && !isPopoverOpen ? 'viewModeOpenContextMenuIcon' : ''}
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
  isViewMode: PropTypes.bool.isRequired,
};
