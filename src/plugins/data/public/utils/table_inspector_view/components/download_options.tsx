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
import { CSV_MIME_TYPE, datatableToCSV } from '../../../../common';
import { Datatable } from '../../../../../expressions';
import { downloadMultipleAs } from '../../../../../share/public';
import { FieldFormatsStart } from '../../../field_formats';
import { IUiSettingsClient } from '../../../../../../core/public';

interface DataDownloadOptionsState {
  isPopoverOpen: boolean;
}

interface DataDownloadOptionsProps {
  title: string;
  datatables: Datatable[];
  uiSettings: IUiSettingsClient;
  isFormatted?: boolean;
  fieldFormats: FieldFormatsStart;
}

class DataDownloadOptions extends Component<DataDownloadOptionsProps, DataDownloadOptionsState> {
  static propTypes = {
    title: PropTypes.string.isRequired,
    uiSettings: PropTypes.object.isRequired,
    datatables: PropTypes.array,
    fieldFormats: PropTypes.object.isRequired,
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

  exportCsv = (isFormatted: boolean = true) => {
    let filename = this.props.title;
    if (!filename || filename.length === 0) {
      filename = i18n.translate('data.inspector.table.downloadOptionsUnsavedFilename', {
        defaultMessage: 'unsaved',
      });
    }

    const content = this.props.datatables.reduce<Record<string, { content: string; type: string }>>(
      (memo, datatable, i) => {
        // skip empty datatables
        if (datatable) {
          const postFix = this.props.datatables.length > 1 ? `-${i + 1}` : '';

          memo[`${filename}${postFix}.csv`] = {
            content: datatableToCSV(datatable, {
              csvSeparator: this.props.uiSettings.get('csv:separator', ','),
              quoteValues: this.props.uiSettings.get('csv:quoteValues', true),
              raw: !isFormatted,
              formatFactory: this.props.fieldFormats.deserialize,
            }),
            type: CSV_MIME_TYPE,
          };
        }
        return memo;
      },
      {}
    );
    if (content) {
      downloadMultipleAs(content);
    }
  };

  exportFormattedCsv = () => {
    this.exportCsv(true);
  };

  exportFormattedAsRawCsv = () => {
    this.exportCsv(false);
  };

  renderFormattedDownloads() {
    const button = (
      <EuiButton iconType="arrowDown" iconSide="right" size="s" onClick={this.onTogglePopover}>
        <FormattedMessage
          id="data.inspector.table.downloadCSVToggleButtonLabel"
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
            id="data.inspector.table.formattedCSVButtonTooltip"
            defaultMessage="Download the data in table format"
          />
        }
        toolTipPosition="left"
      >
        <FormattedMessage
          id="data.inspector.table.formattedCSVButtonLabel"
          defaultMessage="Formatted CSV"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="rawCsv"
        onClick={this.exportFormattedAsRawCsv}
        toolTipContent={
          <FormattedMessage
            id="data.inspector.table.rawCSVButtonTooltip"
            defaultMessage="Download the data as provided, for example, dates as timestamps"
          />
        }
        toolTipPosition="left"
      >
        <FormattedMessage id="data.inspector.table.rawCSVButtonLabel" defaultMessage="Raw CSV" />
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
    return this.renderFormattedDownloads();
  }
}

export { DataDownloadOptions };
