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

import React, { Component } from 'react';

import { EuiButtonIcon, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  getCurl: (cb: (text: string) => void) => void;
  getDocumentation: () => Promise<string | null>;
  autoIndent: (ev?: React.MouseEvent) => void;
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
    this.props.getCurl(text => {
      this.setState({ curlCode: text });
    });
  };

  copyAsCurl() {
    this.copyText(this.state.curlCode);
  }

  copyText(text: string) {
    const textField = document.createElement('textarea');
    textField.innerText = text;
    document.body.appendChild(textField);
    textField.select();
    document.execCommand('copy');
    textField.remove();
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

  openDocs = async () => {
    this.closePopover();
    const documentation = await this.props.getDocumentation();
    if (!documentation) {
      return;
    }
    window.open(documentation, '_blank');
  };

  // Using `any` here per this issue: https://github.com/elastic/eui/issues/2265
  autoIndent: any = (event: React.MouseEvent) => {
    this.closePopover();
    this.props.autoIndent(event);
  };

  render() {
    const button = (
      <EuiButtonIcon
        iconType="wrench"
        onClick={this.onButtonClick}
        data-test-subj="toggleConsoleMenu"
        // @ts-ignore
        aria-label={
          <FormattedMessage
            id="console.requestOptionsButtonAriaLabel"
            defaultMessage="Request options"
          />
        }
      />
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
