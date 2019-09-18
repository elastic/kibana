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

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiInMemoryTable,
  EuiFieldText,
  EuiButtonIcon,
  keyCodes,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export class Table extends Component {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    items: PropTypes.array.isRequired,
    deleteFilter: PropTypes.func.isRequired,
    fieldWildcardMatcher: PropTypes.func.isRequired,
    saveFilter: PropTypes.func.isRequired,
    isSaving: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      editingFilterId: null,
      editingFilterValue: null,
    };
  }

  startEditingFilter = (id, value) =>
    this.setState({ editingFilterId: id, editingFilterValue: value });
  stopEditingFilter = () => this.setState({ editingFilterId: null });
  onEditingFilterChange = e => this.setState({ editingFilterValue: e.target.value });

  onEditFieldKeyDown = ({ keyCode }) => {
    if (keyCodes.ENTER === keyCode) {
      this.props.saveFilter({
        filterId: this.state.editingFilterId,
        newFilterValue: this.state.editingFilterValue,
      });
      this.stopEditingFilter();
    }
    if (keyCodes.ESCAPE === keyCode) {
      this.stopEditingFilter();
    }
  };

  getColumns() {
    const { deleteFilter, fieldWildcardMatcher, indexPattern, saveFilter } = this.props;

    return [
      {
        field: 'value',
        name: i18n.translate('kbn.management.editIndexPattern.source.table.filterHeader', {
          defaultMessage: 'Filter',
        }),
        description: i18n.translate(
          'kbn.management.editIndexPattern.source.table.filterDescription',
          { defaultMessage: 'Filter name' }
        ),
        dataType: 'string',
        sortable: true,
        render: (value, filter) => {
          if (this.state.editingFilterId === filter.clientId) {
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
        name: i18n.translate('kbn.management.editIndexPattern.source.table.matchesHeader', {
          defaultMessage: 'Matches',
        }),
        description: i18n.translate(
          'kbn.management.editIndexPattern.source.table.matchesDescription',
          { defaultMessage: 'Language used for the field' }
        ),
        dataType: 'string',
        sortable: true,
        render: (value, filter) => {
          const realtimeValue =
            this.state.editingFilterId === filter.clientId ? this.state.editingFilterValue : value;
          const matcher = fieldWildcardMatcher([realtimeValue]);
          const matches = indexPattern
            .getNonScriptedFields()
            .map(f => f.name)
            .filter(matcher)
            .sort();
          if (matches.length) {
            return <span>{matches.join(', ')}</span>;
          }

          return (
            <em>
              <FormattedMessage
                id="kbn.management.editIndexPattern.source.table.notMatchedLabel"
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
        render: filter => {
          if (this.state.editingFilterId === filter.clientId) {
            return (
              <Fragment>
                <EuiButtonIcon
                  size="s"
                  onClick={() => {
                    saveFilter({
                      filterId: this.state.editingFilterId,
                      newFilterValue: this.state.editingFilterValue,
                    });
                    this.stopEditingFilter();
                  }}
                  iconType="checkInCircleFilled"
                  aria-label={i18n.translate(
                    'kbn.management.editIndexPattern.source.table.saveAria',
                    { defaultMessage: 'Save' }
                  )}
                />
                <EuiButtonIcon
                  size="s"
                  onClick={() => {
                    this.stopEditingFilter();
                  }}
                  iconType="cross"
                  aria-label={i18n.translate(
                    'kbn.management.editIndexPattern.source.table.cancelAria',
                    { defaultMessage: 'Cancel' }
                  )}
                />
              </Fragment>
            );
          }

          return (
            <Fragment>
              <EuiButtonIcon
                size="s"
                color="danger"
                onClick={() => deleteFilter(filter)}
                iconType="trash"
                aria-label={i18n.translate(
                  'kbn.management.editIndexPattern.source.table.deleteAria',
                  { defaultMessage: 'Delete' }
                )}
              />
              <EuiButtonIcon
                size="s"
                onClick={() => this.startEditingFilter(filter.clientId, filter.value)}
                iconType="pencil"
                aria-label={i18n.translate(
                  'kbn.management.editIndexPattern.source.table.editAria',
                  { defaultMessage: 'Edit' }
                )}
              />
            </Fragment>
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
