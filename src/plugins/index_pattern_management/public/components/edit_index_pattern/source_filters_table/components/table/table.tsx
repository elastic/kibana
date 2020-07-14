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
  keys,
  EuiBasicTableColumn,
  EuiInMemoryTable,
  EuiFieldText,
  EuiButtonIcon,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { IIndexPattern } from 'src/plugins/data/public';
import { SourceFiltersTableFilter } from '../../types';

const filterHeader = i18n.translate(
  'indexPatternManagement.editIndexPattern.source.table.filterHeader',
  {
    defaultMessage: 'Filter',
  }
);

const filterDescription = i18n.translate(
  'indexPatternManagement.editIndexPattern.source.table.filterDescription',
  { defaultMessage: 'Filter name' }
);

const matchesHeader = i18n.translate(
  'indexPatternManagement.editIndexPattern.source.table.matchesHeader',
  {
    defaultMessage: 'Matches',
  }
);

const matchesDescription = i18n.translate(
  'indexPatternManagement.editIndexPattern.source.table.matchesDescription',
  { defaultMessage: 'Language used for the field' }
);

const editAria = i18n.translate('indexPatternManagement.editIndexPattern.source.table.editAria', {
  defaultMessage: 'Edit',
});

const saveAria = i18n.translate('indexPatternManagement.editIndexPattern.source.table.saveAria', {
  defaultMessage: 'Save',
});

const deleteAria = i18n.translate(
  'indexPatternManagement.editIndexPattern.source.table.deleteAria',
  {
    defaultMessage: 'Delete',
  }
);

const cancelAria = i18n.translate(
  'indexPatternManagement.editIndexPattern.source.table.cancelAria',
  {
    defaultMessage: 'Cancel',
  }
);

export interface TableProps {
  indexPattern: IIndexPattern;
  items: SourceFiltersTableFilter[];
  deleteFilter: Function;
  fieldWildcardMatcher: Function;
  saveFilter: (filter: SourceFiltersTableFilter) => any;
  isSaving: boolean;
}

export interface TableState {
  editingFilterId: string | number;
  editingFilterValue: string;
}

export class Table extends Component<TableProps, TableState> {
  constructor(props: TableProps) {
    super(props);
    this.state = {
      editingFilterId: '',
      editingFilterValue: '',
    };
  }

  startEditingFilter = (
    editingFilterId: TableState['editingFilterId'],
    editingFilterValue: TableState['editingFilterValue']
  ) => this.setState({ editingFilterId, editingFilterValue });

  stopEditingFilter = () => this.setState({ editingFilterId: '' });
  onEditingFilterChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    this.setState({ editingFilterValue: e.target.value });

  onEditFieldKeyDown = ({ key }: React.KeyboardEvent<HTMLInputElement>) => {
    if (keys.ENTER === key && this.state.editingFilterId && this.state.editingFilterValue) {
      this.props.saveFilter({
        clientId: this.state.editingFilterId,
        value: this.state.editingFilterValue,
      });
      this.stopEditingFilter();
    }
    if (keys.ESCAPE === key) {
      this.stopEditingFilter();
    }
  };

  getColumns(): Array<EuiBasicTableColumn<SourceFiltersTableFilter>> {
    const { deleteFilter, fieldWildcardMatcher, indexPattern, saveFilter } = this.props;

    return [
      {
        field: 'value',
        name: filterHeader,
        description: filterDescription,
        dataType: 'string',
        sortable: true,
        render: (value, filter) => {
          if (this.state.editingFilterId && this.state.editingFilterId === filter.clientId) {
            return (
              <EuiFieldText
                autoFocus
                value={this.state.editingFilterValue}
                onChange={this.onEditingFilterChange}
                onKeyDown={this.onEditFieldKeyDown}
              />
            );
          }

          return <span>{value}</span>;
        },
      },
      {
        field: 'value',
        name: matchesHeader,
        description: matchesDescription,
        dataType: 'string',
        sortable: true,
        render: (value, filter) => {
          const wildcardMatcher = fieldWildcardMatcher([
            this.state.editingFilterId === filter.clientId ? this.state.editingFilterValue : value,
          ]);
          const matches = indexPattern
            .getNonScriptedFields()
            .map((currentFilter: any) => currentFilter.name)
            .filter(wildcardMatcher)
            .sort();

          if (matches.length) {
            return <span>{matches.join(', ')}</span>;
          }

          return (
            <em>
              <FormattedMessage
                id="indexPatternManagement.editIndexPattern.source.table.notMatchedLabel"
                defaultMessage="The source filter doesn't match any known fields."
              />
            </em>
          );
        },
      },
      {
        name: '',
        align: RIGHT_ALIGNMENT,
        width: '100',
        render: (filter: SourceFiltersTableFilter) => {
          if (this.state.editingFilterId === filter.clientId) {
            return (
              <>
                <EuiButtonIcon
                  size="s"
                  onClick={() => {
                    saveFilter({
                      clientId: this.state.editingFilterId,
                      value: this.state.editingFilterValue,
                    });
                    this.stopEditingFilter();
                  }}
                  iconType="checkInCircleFilled"
                  aria-label={saveAria}
                />
                <EuiButtonIcon
                  size="s"
                  onClick={() => {
                    this.stopEditingFilter();
                  }}
                  iconType="cross"
                  aria-label={cancelAria}
                />
              </>
            );
          }

          return (
            <>
              <EuiButtonIcon
                size="s"
                onClick={() => this.startEditingFilter(filter.clientId, filter.value)}
                iconType="pencil"
                aria-label={editAria}
              />
              <EuiButtonIcon
                size="s"
                color="danger"
                onClick={() => deleteFilter(filter)}
                iconType="trash"
                aria-label={deleteAria}
              />
            </>
          );
        },
      },
    ];
  }

  render() {
    const { items, isSaving } = this.props;
    const columns = this.getColumns();
    const pagination = {
      initialPageSize: 10,
      pageSizeOptions: [5, 10, 25, 50],
    };

    return (
      <EuiInMemoryTable
        loading={isSaving}
        items={items}
        columns={columns}
        pagination={pagination}
        sorting={true}
      />
    );
  }
}
