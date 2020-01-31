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

export class VegaHelpMenu extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
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
      <EuiButtonIcon
        iconType="questionInCircle"
        onClick={this.onButtonClick}
        aria-label={
          <FormattedMessage
            id="visTypeVega.editor.vegaHelpButtonAriaLabel"
            defaultMessage="Vega help"
          />
        }
      />
    );

    const items = [
      <EuiContextMenuItem
        key="vegaHelp"
        target="_blank"
        rel="noopener noreferrer"
        href="https://www.elastic.co/guide/en/kibana/master/vega-graph.html"
        onClick={() => {
          this.closePopover();
        }}
      >
        <FormattedMessage
          id="visTypeVega.editor.vegaHelpLinkText"
          defaultMessage="Kibana Vega Help"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="vegaLiteDocs"
        target="_blank"
        rel="noopener noreferrer"
        href="https://vega.github.io/vega-lite/docs/"
        onClick={() => {
          this.closePopover();
        }}
      >
        <FormattedMessage
          id="visTypeVega.editor.vegaLiteDocumentationLinkText"
          defaultMessage="Vega-Lite Documentation"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="vegaDoc"
        target="_blank"
        rel="noopener noreferrer"
        href="https://vega.github.io/vega/docs/"
        onClick={() => {
          this.closePopover();
        }}
      >
        <FormattedMessage
          id="visTypeVega.editor.vegaDocumentationLinkText"
          defaultMessage="Vega Documentation"
        />
      </EuiContextMenuItem>,
    ];

    return (
      <EuiPopover
        id="helpMenu"
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
    );
  }
}
