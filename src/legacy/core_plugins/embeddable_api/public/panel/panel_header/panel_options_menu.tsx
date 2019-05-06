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

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';

export interface PanelOptionsMenuProps {
  getPanels: () => Promise<EuiContextMenuPanelDescriptor[]>;
  isViewMode: boolean;
  closeContextMenu: boolean;
}

interface PanelOptionsMenuUiProps extends PanelOptionsMenuProps {
  intl: InjectedIntl;
}

interface State {
  panels: EuiContextMenuPanelDescriptor[];
  isPopoverOpen: boolean;
}

class PanelOptionsMenuUi extends React.Component<PanelOptionsMenuUiProps, State> {
  private mounted = false;
  public static getDerivedStateFromProps(props: PanelOptionsMenuUiProps, state: State) {
    if (props.closeContextMenu) {
      return {
        ...state,
        isPopoverOpen: false,
      };
    } else {
      return state;
    }
  }

  constructor(props: PanelOptionsMenuUiProps) {
    super(props);
    this.state = {
      panels: [],
      isPopoverOpen: false,
    };
  }

  public async componentDidMount() {
    this.mounted = true;
    this.setState({ panels: [] });
    const panels = await this.props.getPanels();
    if (this.mounted) {
      this.setState({ panels });
    }
  }

  public componentWillUnmount() {
    this.mounted = false;
  }

  public render() {
    const { isViewMode, intl } = this.props;
    const button = (
      <EuiButtonIcon
        iconType={isViewMode ? 'boxesHorizontal' : 'gear'}
        color="text"
        className="embPanel_optionsMenuButton"
        aria-label={intl.formatMessage({
          id: 'kbn.dashboard.panel.optionsMenu.panelOptionsButtonAriaLabel',
          defaultMessage: 'Panel options',
        })}
        data-test-subj="embeddablePanelToggleMenuIcon"
        onClick={this.toggleContextMenu}
      />
    );

    return (
      <EuiPopover
        id="dashboardPanelContextMenu"
        className="embPanel_optionsMenuPopover"
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
        <EuiContextMenu initialPanelId="mainMenu" panels={this.state.panels} />
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
    if (this.mounted) {
      this.setState(
        {
          isPopoverOpen: !this.state.isPopoverOpen,
        },
        async () => {
          if (this.mounted && this.state.isPopoverOpen) {
            this.setState({ panels: [] });
            const panels = await this.props.getPanels();
            this.setState({ panels });
          }
        }
      );
    }
  };
}

export const PanelOptionsMenu = injectI18n(PanelOptionsMenuUi);
