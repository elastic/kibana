/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiInMemoryTable,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { DataDownloadOptions } from './download_options';
import { DataViewRow, DataViewColumn } from '../types';
import { TabularData } from '../../../../common/adapters/data/types';
import { IUiSettingsClient } from '../../../../../../core/public';

interface DataTableFormatState {
  columns: DataViewColumn[];
  rows: DataViewRow[];
}

interface DataTableFormatProps {
  data: TabularData;
  exportTitle: string;
  uiSettings: IUiSettingsClient;
  isFormatted?: boolean;
}

export class DataTableFormat extends Component<DataTableFormatProps, DataTableFormatState> {
  static propTypes = {
    data: PropTypes.object.isRequired,
    exportTitle: PropTypes.string.isRequired,
    uiSettings: PropTypes.object.isRequired,
    isFormatted: PropTypes.bool,
  };

  csvSeparator = this.props.uiSettings.get('csv:separator', ',');
  quoteValues = this.props.uiSettings.get('csv:quoteValues', true);
  state = {} as DataTableFormatState;

  static renderCell(dataColumn: any, value: any, isFormatted: boolean = false) {
    return (
      <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>{isFormatted ? value.formatted : value}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} gutterSize="none" alignItems="center">
            {dataColumn.filter && (
              <EuiToolTip
                position="bottom"
                content={
                  <FormattedMessage
                    id="inspector.data.filterForValueButtonTooltip"
                    defaultMessage="Filter for value"
                  />
                }
              >
                <EuiButtonIcon
                  iconType="plusInCircle"
                  color="text"
                  aria-label={i18n.translate('inspector.data.filterForValueButtonAriaLabel', {
                    defaultMessage: 'Filter for value',
                  })}
                  data-test-subj="filterForInspectorCellValue"
                  className="insDataTableFormat__filter"
                  onClick={() => dataColumn.filter(value)}
                />
              </EuiToolTip>
            )}

            {dataColumn.filterOut && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  position="bottom"
                  content={
                    <FormattedMessage
                      id="inspector.data.filterOutValueButtonTooltip"
                      defaultMessage="Filter out value"
                    />
                  }
                >
                  <EuiButtonIcon
                    iconType="minusInCircle"
                    color="text"
                    aria-label={i18n.translate('inspector.data.filterOutValueButtonAriaLabel', {
                      defaultMessage: 'Filter out value',
                    })}
                    data-test-subj="filterOutInspectorCellValue"
                    className="insDataTableFormat__filter"
                    onClick={() => dataColumn.filterOut(value)}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  static getDerivedStateFromProps({ data, isFormatted }: DataTableFormatProps) {
    if (!data) {
      return {
        columns: null,
        rows: null,
      };
    }

    const columns = data.columns.map((dataColumn: any) => ({
      name: dataColumn.name,
      field: dataColumn.field,
      sortable: isFormatted ? (row: DataViewRow) => row[dataColumn.field].raw : true,
      render: (value: any) => DataTableFormat.renderCell(dataColumn, value, isFormatted),
    }));

    return { columns, rows: data.rows };
  }

  render() {
    const { columns, rows } = this.state;
    const pagination = {
      pageSizeOptions: [10, 20, 50],
      initialPageSize: 20,
    };

    return (
      <>
        <EuiFlexGroup>
          <EuiFlexItem grow={true} />
          <EuiFlexItem grow={false}>
            <DataDownloadOptions
              isFormatted={this.props.isFormatted}
              title={this.props.exportTitle}
              csvSeparator={this.csvSeparator}
              quoteValues={this.quoteValues}
              columns={columns}
              rows={rows}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiInMemoryTable
          className="insDataTableFormat__table"
          data-test-subj="inspectorTable"
          columns={columns}
          items={rows}
          sorting={true}
          pagination={pagination}
        />
      </>
    );
  }
}
