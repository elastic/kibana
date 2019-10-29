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

import { i18n } from '@kbn/i18n';
import React from 'react';

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';

export interface PanelOptionsMenuProps {
  getActionContextMenuPanel: () => Promise<EuiContextMenuPanelDescriptor>;
  isViewMode: boolean;
  closeContextMenu: boolean;
  title?: string;
}

interface State {
  actionContextMenuPanel?: EuiContextMenuPanelDescriptor;
  isPopoverOpen: boolean;
}

export class PanelOptionsMenu extends React.Component<PanelOptionsMenuProps, State> {
  private mounted = false;
  public static getDerivedStateFromProps(props: PanelOptionsMenuProps, state: State) {
    if (props.closeContextMenu) {
      return {
        ...state,
        isPopoverOpen: false,
      };
    } else {
      return state;
    }
  }

  constructor(props: PanelOptionsMenuProps) {
    super(props);
    this.state = {
      actionContextMenuPanel: undefined,
      isPopoverOpen: false,
    };
  }

  public async componentDidMount() {
    this.mounted = true;
    this.setState({ actionContextMenuPanel: undefined });
    const actionContextMenuPanel = await this.props.getActionContextMenuPanel();
    if (this.mounted) {
      this.setState({ actionContextMenuPanel });
    }
  }

  public componentWillUnmount() {
    this.mounted = false;
  }

  public render() {
    const { isViewMode, title } = this.props;
    const enhancedAriaLabel = i18n.translate(
      'embeddableApi.panel.optionsMenu.panelOptionsButtonEnhancedAriaLabel',
      {
        defaultMessage: 'Panel options for {title}',
        values: { title },
      }
    );
    const ariaLabelWithoutTitle = i18n.translate(
      'embeddableApi.panel.optionsMenu.panelOptionsButtonAriaLabel',
      {
        defaultMessage: 'Panel options',
      }
    );

    const button = (
      <EuiButtonIcon
        iconType={isViewMode ? 'boxesHorizontal' : 'gear'}
        color="text"
        className="embPanel__optionsMenuButton"
        aria-label={title ? enhancedAriaLabel : ariaLabelWithoutTitle}
        data-test-subj="embeddablePanelToggleMenuIcon"
        onClick={this.toggleContextMenu}
      />
    );

    return (
      <EuiPopover
        className="embPanel__optionsMenuPopover"
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downRight"
        data-test-subj={
          this.state.isPopoverOpen
            ? 'embeddablePanelContextMenuOpen'
            : 'embeddablePanelContextMenuClosed'
        }
        withTitle
      >
        <EuiContextMenu
          initialPanelId="mainMenu"
          panels={this.state.actionContextMenuPanel ? [this.state.actionContextMenuPanel] : []}
        />
      </EuiPopover>
    );
  }
  private closePopover = () => {
    if (this.mounted) {
      this.setState({
        isPopoverOpen: false,
      });
    }
  };

  private toggleContextMenu = () => {
    if (!this.mounted) return;
    const after = () => {
      if (!this.state.isPopoverOpen) return;
      this.setState({ actionContextMenuPanel: undefined });
      this.props
        .getActionContextMenuPanel()
        .then(actionContextMenuPanel => {
          if (!this.mounted) return;
          this.setState({ actionContextMenuPanel });
        })
        .catch(error => console.error(error)); // eslint-disable-line no-console
    };
    this.setState(({ isPopoverOpen }) => ({ isPopoverOpen: !isPopoverOpen }), after);
  };
}
