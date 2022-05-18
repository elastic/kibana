/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';

import { NotificationsSetup } from '@kbn/core/public';

import {
  EuiIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiLink,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface Props {
  getCurl: () => Promise<string>;
  getDocumentation: () => Promise<string | null>;
  autoIndent: (ev: React.MouseEvent) => void;
  notifications: NotificationsSetup;
}

interface State {
  isPopoverOpen: boolean;
  curlCode: string;
}

export class ConsoleMenu extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      curlCode: '',
      isPopoverOpen: false,
    };
  }

  mouseEnter = () => {
    if (this.state.isPopoverOpen) return;
    this.props.getCurl().then((text) => {
      this.setState({ curlCode: text });
    });
  };

  async copyAsCurl() {
    const { notifications } = this.props;
    try {
      await this.copyText(this.state.curlCode);
      notifications.toasts.add({
        title: i18n.translate('console.consoleMenu.copyAsCurlMessage', {
          defaultMessage: 'Request copied as cURL',
        }),
      });
    } catch (e) {
      notifications.toasts.addError(e, {
        title: i18n.translate('console.consoleMenu.copyAsCurlFailedMessage', {
          defaultMessage: 'Could not copy request as cURL',
        }),
      });
    }
  }

  async copyText(text: string) {
    if (window.navigator?.clipboard) {
      await window.navigator.clipboard.writeText(text);
      return;
    }
    throw new Error('Could not copy to clipboard!');
  }

  onButtonClick = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  openDocs = async () => {
    this.closePopover();
    const documentation = await this.props.getDocumentation();
    if (!documentation) {
      return;
    }
    window.open(documentation, '_blank');
  };

  autoIndent = (event: React.MouseEvent) => {
    this.closePopover();
    this.props.autoIndent(event);
  };

  render() {
    const button = (
      <EuiLink
        onClick={this.onButtonClick}
        data-test-subj="toggleConsoleMenu"
        aria-label={i18n.translate('console.requestOptionsButtonAriaLabel', {
          defaultMessage: 'Request options',
        })}
      >
        <EuiIcon type="wrench" />
      </EuiLink>
    );

    const items = [
      <EuiContextMenuItem
        key="Copy as cURL"
        id="ConCopyAsCurl"
        disabled={!window.navigator?.clipboard}
        onClick={() => {
          this.closePopover();
          this.copyAsCurl();
        }}
      >
        <FormattedMessage
          id="console.requestOptions.copyAsUrlButtonLabel"
          defaultMessage="Copy as cURL"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="Open documentation"
        data-test-subj="consoleMenuOpenDocs"
        onClick={() => {
          this.openDocs();
        }}
      >
        <FormattedMessage
          id="console.requestOptions.openDocumentationButtonLabel"
          defaultMessage="Open documentation"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        data-test-subj="consoleMenuAutoIndent"
        key="Auto indent"
        onClick={this.autoIndent}
      >
        <FormattedMessage
          id="console.requestOptions.autoIndentButtonLabel"
          defaultMessage="Auto indent"
        />
      </EuiContextMenuItem>,
    ];

    return (
      <span onMouseEnter={this.mouseEnter}>
        <EuiPopover
          id="contextMenu"
          button={button}
          isOpen={this.state.isPopoverOpen}
          closePopover={this.closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel items={items} />
        </EuiPopover>
      </span>
    );
  }
}
