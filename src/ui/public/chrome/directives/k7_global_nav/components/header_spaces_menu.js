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

import React, {
  Component,
} from 'react';

import {
  EuiHeaderSectionItemButton,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiButton,
  EuiAvatar,
} from '@elastic/eui';

/**
 * Placeholder for now from eui demo. Will need to be populated by Spaces plugin
 */
export class HeaderSpacesMenu extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
    };
  }

  onMenuButtonClick = () => {
    this.setState({
      isOpen: !this.state.isOpen,
    });
  };

  closeMenu = () => {
    this.setState({
      isOpen: false,
    });
  };

  render() {
    const button = (
      <EuiHeaderSectionItemButton
        aria-controls="headerSpacesMenuList"
        aria-expanded={this.state.isOpen}
        aria-haspopup="true"
        aria-label="Apps menu"
        onClick={this.onMenuButtonClick}
      >
        <EuiAvatar type="space" size="s" name="Sales Team" />
      </EuiHeaderSectionItemButton>
    );

    const items = [
      (
        <EuiContextMenuItem
          key="Sales Team"
          icon={(<EuiAvatar type="space" name="Sales Team" size="s" />)}
          onClick={() => { this.closeMenu(); }}
        >
          Sales Team
        </EuiContextMenuItem>
      ), (
        <EuiContextMenuItem
          key="Engineering"
          icon={(<EuiAvatar type="space" name="Engineering" size="s" />)}
          onClick={() => { this.closeMenu(); }}
        >
          Engineering
        </EuiContextMenuItem>
      ), (
        <EuiContextMenuItem
          key="Security"
          icon={(<EuiAvatar type="space" name="Security" size="s" initialsLength={2} />)}
          onClick={() => { this.closeMenu(); }}
        >
          Security
        </EuiContextMenuItem>
      ), (
        <div className="euiContextMenuItem">
          <EuiButton size="s" style={{ width: `100%` }}>Manage spaces</EuiButton>
        </div>
      )
    ];

    return (
      <EuiPopover
        id="headerSpacesMenu"
        ownFocus
        button={button}
        isOpen={this.state.isOpen}
        anchorPosition="downLeft"
        closePopover={this.closeMenu}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel
          id="headerSpacesMenuList"
          title="Change current space"
          items={items}
        />
      </EuiPopover>
    );
  }
}