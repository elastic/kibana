/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';

import { EuiIcon, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

interface Props {
  getCurl: () => Promise<string>;
  getDocumentation: () => Promise<string | null>;
  autoIndent: (ev: React.MouseEvent) => void;
  addNotification?: (opts: { title: string }) => void;
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

  copyAsCurl() {
    this.copyText(this.state.curlCode);
    const { addNotification } = this.props;
    if (addNotification) {
      addNotification({
        title: i18n.translate('console.consoleMenu.copyAsCurlMessage', {
          defaultMessage: 'Request copied as cURL',
        }),
      });
    }
  }

  /**
   * Use the document.execCommand('copy') API to interact with the system clipboard.
   *
   * See https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
   */
  legacyCopyText(text: string) {
    const textField = document.createElement('textarea');
    textField.innerText = text;
    document.body.appendChild(textField);
    textField.select();
    document.execCommand('copy');
    textField.remove();
  }

  /**
   * Best effort functionality to write provided text to the system clipboard
   */
  copyText(text: string) {
    // We prefer using the Clipboard API to interact with the system clipboard. It has widespread support among
    // browsers: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard.
    if (window.navigator?.clipboard) {
      window.navigator.clipboard.writeText(text);
    } else {
      // If, for some reason, the system clipboard is not accessible we try the legacy document.execCommand.
      this.legacyCopyText(text);
    }
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
      <button
        className="euiButtonIcon--primary"
        onClick={this.onButtonClick}
        data-test-subj="toggleConsoleMenu"
        aria-label={i18n.translate('console.requestOptionsButtonAriaLabel', {
          defaultMessage: 'Request options',
        })}
      >
        <EuiIcon type="wrench" />
      </button>
    );

    const items = [
      <EuiContextMenuItem
        key="Copy as cURL"
        id="ConCopyAsCurl"
        disabled={!document.queryCommandSupported('copy')}
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
