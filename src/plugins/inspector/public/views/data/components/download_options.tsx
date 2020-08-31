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
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { DataViewColumn, DataViewRow } from '../types';

import { exportAsCsv } from '../lib/export_csv';

interface DataDownloadOptionsState {
  isPopoverOpen: boolean;
}

interface DataDownloadOptionsProps {
  title: string;
  columns: DataViewColumn[];
  rows: DataViewRow[];
  csvSeparator: string;
  quoteValues: boolean;
  isFormatted?: boolean;
}

class DataDownloadOptions extends Component<DataDownloadOptionsProps, DataDownloadOptionsState> {
  static propTypes = {
    title: PropTypes.string.isRequired,
    csvSeparator: PropTypes.string.isRequired,
    quoteValues: PropTypes.bool.isRequired,
    isFormatted: PropTypes.bool,
    columns: PropTypes.array,
    rows: PropTypes.array,
  };

  state = {
    isPopoverOpen: false,
  };

  onTogglePopover = () => {
    this.setState((state) => ({
      isPopoverOpen: !state.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  exportCsv = (customParams: any = {}) => {
    let filename = this.props.title;
    if (!filename || filename.length === 0) {
      filename = i18n.translate('inspector.data.downloadOptionsUnsavedFilename', {
        defaultMessage: 'unsaved',
      });
    }
    exportAsCsv({
      filename: `${filename}.csv`,
      columns: this.props.columns,
      rows: this.props.rows,
      csvSeparator: this.props.csvSeparator,
      quoteValues: this.props.quoteValues,
      ...customParams,
    });
  };

  exportFormattedCsv = () => {
    this.exportCsv({
      valueFormatter: (item: any) => item.formatted,
    });
  };

  exportFormattedAsRawCsv = () => {
    this.exportCsv({
      valueFormatter: (item: any) => item.raw,
    });
  };

  renderUnformattedDownload() {
    return (
      <EuiButton size="s" onClick={this.exportCsv}>
        <FormattedMessage
          id="inspector.data.downloadCSVButtonLabel"
          defaultMessage="Download CSV"
        />
      </EuiButton>
    );
  }

  renderFormattedDownloads() {
    const button = (
      <EuiButton iconType="arrowDown" iconSide="right" size="s" onClick={this.onTogglePopover}>
        <FormattedMessage
          id="inspector.data.downloadCSVToggleButtonLabel"
          defaultMessage="Download CSV"
        />
      </EuiButton>
    );
    const items = [
      <EuiContextMenuItem
        key="csv"
        onClick={this.exportFormattedCsv}
        toolTipContent={
          <FormattedMessage
            id="inspector.data.formattedCSVButtonTooltip"
            defaultMessage="Download the data in table format"
          />
        }
        toolTipPosition="left"
      >
        <FormattedMessage
          id="inspector.data.formattedCSVButtonLabel"
          defaultMessage="Formatted CSV"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="rawCsv"
        onClick={this.exportFormattedAsRawCsv}
        toolTipContent={
          <FormattedMessage
            id="inspector.data.rawCSVButtonTooltip"
            defaultMessage="Download the data as provided, for example, dates as timestamps"
          />
        }
        toolTipPosition="left"
      >
        <FormattedMessage id="inspector.data.rawCSVButtonLabel" defaultMessage="Raw CSV" />
      </EuiContextMenuItem>,
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
        <EuiContextMenuPanel className="eui-textNoWrap" items={items} />
      </EuiPopover>
    );
  }

  render() {
    return this.props.isFormatted
      ? this.renderFormattedDownloads()
      : this.renderUnformattedDownload();
  }
}

export { DataDownloadOptions };
