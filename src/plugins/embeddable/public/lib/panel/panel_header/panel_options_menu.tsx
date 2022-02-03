/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  getActionContextMenuPanel: () => Promise<EuiContextMenuPanelDescriptor[]>;
  isViewMode: boolean;
  closeContextMenu: boolean;
  title?: string;
  index?: number;
}

interface State {
  actionContextMenuPanel?: EuiContextMenuPanelDescriptor[];
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
    const { isViewMode, title, index } = this.props;
    const enhancedAriaLabel = i18n.translate(
      'embeddableApi.panel.optionsMenu.panelOptionsButtonEnhancedAriaLabel',
      {
        defaultMessage: 'Panel options for {title}',
        values: { title },
      }
    );
    const ariaLabelWithoutTitle =
      index === undefined
        ? i18n.translate('embeddableApi.panel.optionsMenu.panelOptionsButtonAriaLabel', {
            defaultMessage: 'Panel options',
          })
        : i18n.translate('embeddableApi.panel.optionsMenu.panelOptionsButtonAriaLabelWithIndex', {
            defaultMessage: 'Options for panel {index}',
            values: { index },
          });

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
      >
        <EuiContextMenu
          initialPanelId="mainMenu"
          panels={this.state.actionContextMenuPanel || []}
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
        .then((actionContextMenuPanel) => {
          if (!this.mounted) return;
          this.setState({ actionContextMenuPanel });
        })
        .catch((error) => console.error(error)); // eslint-disable-line no-console
    };
    this.setState(({ isPopoverOpen }) => ({ isPopoverOpen: !isPopoverOpen }), after);
  };
}
