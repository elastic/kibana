/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
