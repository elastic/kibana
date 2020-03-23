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
