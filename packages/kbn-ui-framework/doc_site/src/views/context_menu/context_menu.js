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
  KuiButton,
  KuiContextMenu,
  KuiFieldGroup,
  KuiFieldGroupSection,
  KuiPopover,
} from '../../../../components';

function flattenPanelTree(tree, array = []) {
  array.push(tree);

  if (tree.items) {
    tree.items.forEach(item => {
      if (item.panel) {
        flattenPanelTree(item.panel, array);
        item.panel = item.panel.id;
      }
    });
  }

  return array;
}

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };

    const panelTree = {
      id: 0,
      title: 'View options',
      items: [{
        name: 'Show fullscreen',
        icon: (
          <span className="kuiIcon fa-search" />
        ),
        onClick: () => { this.closePopover(); window.alert('Show fullscreen'); },
      }, {
        name: 'Share this dashboard',
        icon: <span className="kuiIcon fa-user" />,
        panel: {
          id: 1,
          title: 'Share this dashboard',
          items: [{
            name: 'PDF reports',
            icon: <span className="kuiIcon fa-user" />,
            onClick: () => { this.closePopover(); window.alert('PDF reports'); },
          }, {
            name: 'CSV reports',
            icon: <span className="kuiIcon fa-user" />,
            onClick: () => { this.closePopover(); window.alert('CSV reports'); },
          }, {
            name: 'Embed code',
            icon: <span className="kuiIcon fa-user" />,
            panel: {
              id: 2,
              title: 'Embed code',
              content: (
                <div style={{ padding: 16 }}>
                  <div className="kuiVerticalRhythmSmall">
                    <KuiFieldGroup>
                      <KuiFieldGroupSection isWide>
                        <div className="kuiSearchInput">
                          <div className="kuiSearchInput__icon kuiIcon fa-search" />
                          <input
                            className="kuiSearchInput__input"
                            type="text"
                          />
                        </div>
                      </KuiFieldGroupSection>

                      <KuiFieldGroupSection>
                        <select className="kuiSelect">
                          <option>Animal</option>
                          <option>Mineral</option>
                          <option>Vegetable</option>
                        </select>
                      </KuiFieldGroupSection>
                    </KuiFieldGroup>
                  </div>

                  <div className="kuiVerticalRhythmSmall">
                    <KuiButton buttonType="primary">Save</KuiButton>
                  </div>
                </div>
              ),
            },
          }, {
            name: 'Permalinks',
            icon: <span className="kuiIcon fa-user" />,
            onClick: () => { this.closePopover(); window.alert('Permalinks'); },
          }],
        },
      }, {
        name: 'Edit / add panels',
        icon: <span className="kuiIcon fa-user" />,
        onClick: () => { this.closePopover(); window.alert('Edit / add panels'); },
      }, {
        name: 'Display options',
        icon: <span className="kuiIcon fa-user" />,
        onClick: () => { this.closePopover(); window.alert('Display options'); },
      }, {
        name: 'Disabled option',
        icon: <span className="kuiIcon fa-user" />,
        disabled: true,
        onClick: () => { this.closePopover(); window.alert('Disabled option'); },
      }],
    };

    this.panels = flattenPanelTree(panelTree);
  }

  onButtonClick = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  render() {
    const button = (
      <KuiButton buttonType="basic" onClick={this.onButtonClick}>
        Click me to load a context menu
      </KuiButton>
    );

    return (
      <KuiPopover
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        withTitle
        anchorPosition="left"
      >
        <KuiContextMenu
          initialPanelId={0}
          panels={this.panels}
        />
      </KuiPopover>
    );
  }
}
