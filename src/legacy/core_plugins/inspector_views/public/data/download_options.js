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

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
} from '@elastic/eui';

import { exportAsCsv } from './lib/export_csv';
import { FormattedMessage } from '@kbn/i18n/react';

class DataDownloadOptions extends Component {

  state = {
    isPopoverOpen: false,
  };

  onTogglePopover = () => {
    this.setState(state => ({
      isPopoverOpen: !state.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  exportCsv = () => {
    exportAsCsv(`${this.props.title}.csv`, this.props.columns, this.props.rows);
  }

  exportFormattedCsv = () => {
    exportAsCsv(`${this.props.title}.csv`, this.props.columns, this.props.rows, item => item.formatted);
  };

  exportFormattedAsRawCsv = () => {
    exportAsCsv(`${this.props.title}.csv`, this.props.columns, this.props.rows, item => item.raw);
  };

  renderUnformattedDownload() {
    return (
      <EuiButton
        size="s"
        onClick={this.exportCsv}
      >
        <FormattedMessage
          id="inspectorViews.data.downloadCSVButtonLabel"
          defaultMessage="Download CSV"
        />
      </EuiButton>
    );
  }

  renderFormattedDownloads() {
    const button = (
      <EuiButton
        iconType="arrowDown"
        iconSide="right"
        size="s"
        onClick={this.onTogglePopover}
      >
        <FormattedMessage
          id="inspectorViews.data.downloadCSVToggleButtonLabel"
          defaultMessage="Download CSV"
        />
      </EuiButton>
    );
    const items = [
      <EuiContextMenuItem
        key="csv"
        onClick={this.exportFormattedCsv}
        toolTipContent={<FormattedMessage
          id="inspectorViews.data.formattedCSVButtonTooltip"
          defaultMessage="Download the data in table format"
        />}
        toolTipPosition="left"
      >
        <FormattedMessage
          id="inspectorViews.data.formattedCSVButtonLabel"
          defaultMessage="Formatted CSV"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="rawCsv"
        onClick={this.exportFormattedAsRawCsv}
        toolTipContent={<FormattedMessage
          id="inspectorViews.data.rawCSVButtonTooltip"
          defaultMessage="Download the data as provided, for example, dates as timestamps"
        />}
        toolTipPosition="left"
      >
        <FormattedMessage
          id="inspectorViews.data.rawCSVButtonLabel"
          defaultMessage="Raw CSV"
        />
      </EuiContextMenuItem>
    ];

    return (
      <EuiPopover
        id="inspectorDownloadData"
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        repositionOnScroll
      >
        <EuiContextMenuPanel
          className="eui-textNoWrap"
          items={items}
        />
      </EuiPopover>
    );
  }

  render() {
    if (!this.props.isFormatted) {
      return this.renderUnformattedDownload();
    }

    return this.renderFormattedDownloads();
  }
}

export { DataDownloadOptions };
