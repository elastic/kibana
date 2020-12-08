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
import { IUiSettingsClient } from '../../../../../../core/public';
import { Datatable, DatatableColumn } from '../../../../../expressions/public';
import { FieldFormatsStart } from '../../../field_formats';
import { UiActionsStart } from '../../../../../ui_actions/public';

interface DataTableFormatState {
  columns: DataViewColumn[];
  rows: DataViewRow[];
}

interface DataTableFormatProps {
  data: Datatable;
  exportTitle: string;
  uiSettings: IUiSettingsClient;
  fieldFormats: FieldFormatsStart;
  uiActions: UiActionsStart;
  isFilterable: (column: DatatableColumn) => boolean;
}

interface RenderCellArguments {
  table: Datatable;
  columnIndex: number;
  rowIndex: number;
  formattedValue: string;
  uiActions: UiActionsStart;
  isFilterable: boolean;
}

export class DataTableFormat extends Component<DataTableFormatProps, DataTableFormatState> {
  static propTypes = {
    data: PropTypes.object.isRequired,
    exportTitle: PropTypes.string.isRequired,
    uiSettings: PropTypes.object.isRequired,
    fieldFormats: PropTypes.object.isRequired,
    uiActions: PropTypes.object.isRequired,
    isFilterable: PropTypes.func.isRequired,
  };

  csvSeparator = this.props.uiSettings.get('csv:separator', ',');
  quoteValues = this.props.uiSettings.get('csv:quoteValues', true);
  state = {} as DataTableFormatState;

  static renderCell({
    table,
    columnIndex,
    rowIndex,
    formattedValue,
    uiActions,
    isFilterable,
  }: RenderCellArguments) {
    const column = table.columns[columnIndex];
    return (
      <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>{formattedValue}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} gutterSize="none" alignItems="center">
            {isFilterable && (
              <EuiToolTip
                position="bottom"
                content={
                  <FormattedMessage
                    id="data.inspector.table.filterForValueButtonTooltip"
                    defaultMessage="Filter for value"
                  />
                }
              >
                <EuiButtonIcon
                  iconType="plusInCircle"
                  color="text"
                  aria-label={i18n.translate('data.inspector.table.filterForValueButtonAriaLabel', {
                    defaultMessage: 'Filter for value',
                  })}
                  data-test-subj="filterForInspectorCellValue"
                  className="insDataTableFormat__filter"
                  onClick={() => {
                    const value = table.rows[rowIndex][column.id];
                    const eventData = { table, column: columnIndex, row: rowIndex, value };
                    uiActions.executeTriggerActions('VALUE_CLICK_TRIGGER', {
                      data: { data: [eventData] },
                    });
                  }}
                />
              </EuiToolTip>
            )}

            {isFilterable && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  position="bottom"
                  content={
                    <FormattedMessage
                      id="data.inspector.table.filterOutValueButtonTooltip"
                      defaultMessage="Filter out value"
                    />
                  }
                >
                  <EuiButtonIcon
                    iconType="minusInCircle"
                    color="text"
                    aria-label={i18n.translate(
                      'data.inspector.table.filterOutValueButtonAriaLabel',
                      {
                        defaultMessage: 'Filter out value',
                      }
                    )}
                    data-test-subj="filterOutInspectorCellValue"
                    className="insDataTableFormat__filter"
                    onClick={() => {
                      const value = table.rows[rowIndex][column.id];
                      const eventData = { table, column: columnIndex, row: rowIndex, value };
                      uiActions.executeTriggerActions('VALUE_CLICK_TRIGGER', {
                        data: { data: [eventData], negate: true },
                      });
                    }}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  static getDerivedStateFromProps({
    data,
    uiActions,
    fieldFormats,
    isFilterable,
  }: DataTableFormatProps) {
    if (!data) {
      return {
        columns: null,
        rows: null,
      };
    }

    const columns = data.columns.map((dataColumn: any, index: number) => {
      const formatParams = { id: 'string', ...dataColumn.meta.params };
      const fieldFormatter = fieldFormats.deserialize(formatParams);
      const filterable = isFilterable(dataColumn);
      return {
        name: dataColumn.name,
        field: dataColumn.id,
        sortable: true,
        render: (value: any) => {
          const formattedValue = fieldFormatter.convert(value);
          const rowIndex = data.rows.findIndex((row) => row[dataColumn.id] === value) || 0;

          return DataTableFormat.renderCell({
            table: data,
            columnIndex: index,
            rowIndex,
            formattedValue,
            uiActions,
            isFilterable: filterable,
          });
        },
      };
    });

    return { columns, rows: data.rows.map((row, index) => ({ ...row, __rowIndex: index })) };
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
