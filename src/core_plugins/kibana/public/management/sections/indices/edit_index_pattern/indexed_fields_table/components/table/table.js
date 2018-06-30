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

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiIcon,
  EuiInMemoryTable,
  EuiIconTip,
} from '@elastic/eui';

import { ReactI18n } from '@kbn/i18n';

const { I18nContext } = ReactI18n;

export class Table extends PureComponent {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    items: PropTypes.array.isRequired,
    editField: PropTypes.func.isRequired
  }

  renderBooleanTemplate(value, label) {
    return value ? <EuiIcon type="dot" color="secondary" aria-label={label}/> : <span/>;
  }

  renderFieldName(name, isTimeField, label, content) {
    return (
      <span>
        {name}
        {isTimeField ? (
          <span>
            &nbsp;
            <EuiIconTip
              type="clock"
              color="primary"
              aria-label={label}
              content={content}
            />
          </span>
        ) : ''}
      </span>
    );
  }

  renderFieldType(type, isConflict, label, content) {
    return (
      <span>
        {type}
        {isConflict ? (
          <span>
            &nbsp;
            <EuiIconTip
              type="alert"
              color="warning"
              aria-label={label}
              content={content}
            />
          </span>
        ) : ''}
      </span>
    );
  }

  render() {
    const { indexPattern, items, editField } = this.props;

    const pagination = {
      initialPageSize: 10,
      pageSizeOptions: [5, 10, 25, 50]
    };

    const getColumns = (intl) => ([
      {
        field: 'displayName',
        name: intl.formatMessage({ id: 'kbn.management.indexPattern.edit.fields.table.name.header', defaultMessage: 'Name' }),
        dataType: 'string',
        sortable: true,
        render: (value) => {
          return this.renderFieldName(value,
            indexPattern.timeFieldName === value,
            intl.formatMessage({
              id: 'kbn.management.indexPattern.edit.fields.table.primaryTime.aria', defaultMessage: 'Primary time field' }),
            intl.formatMessage({
              id: 'kbn.management.indexPattern.edit.fields.table.primaryTime.tooltip',
              defaultMessage: 'This field represents the time that events occurred.' }));
        },
        width: '38%',
        'data-test-subj': 'indexedFieldName',
      },
      {
        field: 'type',
        name: intl.formatMessage({ id: 'kbn.management.indexPattern.edit.fields.table.type.header', defaultMessage: 'Type' }),
        dataType: 'string',
        sortable: true,
        render: (value) => {
          return this.renderFieldType(value,
            value === 'conflict',
            intl.formatMessage({
              id: 'kbn.management.indexPattern.edit.fields.table.multiType.aria', defaultMessage: 'Multiple type field' }),
            intl.formatMessage({
              id: 'kbn.management.indexPattern.edit.fields.table.multiType.tooltip',
              defaultMessage: 'The type of this field changes across indices. It is unavailable for many analysis functions.' }));
        },
        'data-test-subj': 'indexedFieldType',
      },
      {
        field: 'format',
        name: intl.formatMessage({ id: 'kbn.management.indexPattern.edit.fields.table.format.header', defaultMessage: 'Format' }),
        dataType: 'string',
        sortable: true,
      },
      {
        field: 'searchable',
        name: intl.formatMessage({ id: 'kbn.management.indexPattern.edit.fields.table.searchable.header', defaultMessage: 'Searchable' }),
        description: intl.formatMessage({
          id: 'kbn.management.indexPattern.edit.fields.table.searchable.description',
          defaultMessage: 'These fields can be used in the filter bar' }),
        dataType: 'boolean',
        sortable: true,
        render: (value) => this.renderBooleanTemplate(value, intl.formatMessage({
          id: 'kbn.management.indexPattern.edit.fields.table.isSearchable.aria', defaultMessage: 'Is searchable' })),
      },
      {
        field: 'aggregatable',
        name: intl.formatMessage({
          id: 'kbn.management.indexPattern.edit.fields.table.aggregatable.label', defaultMessage: 'Aggregatable' }),
        description: intl.formatMessage({
          id: 'kbn.management.indexPattern.edit.fields.table.aggregatable.description',
          defaultMessage: 'These fields can be used in visualization aggregations' }),
        dataType: 'boolean',
        sortable: true,
        render: (value) => this.renderBooleanTemplate(value, intl.formatMessage({
          id: 'kbn.management.indexPattern.edit.fields.table.isAggregatable.aria', defaultMessage: 'Is aggregatable' })),
      },
      {
        field: 'excluded',
        name: intl.formatMessage({ id: 'kbn.management.indexPattern.edit.fields.table.excluded.label', defaultMessage: 'Excluded' }),
        description: intl.formatMessage({
          id: 'kbn.management.indexPattern.edit.fields.table.excluded.description',
          defaultMessage: 'Fields that are excluded from _source when it is fetched' }),
        dataType: 'boolean',
        sortable: true,
        render: (value) => this.renderBooleanTemplate(value, intl.formatMessage({
          id: 'kbn.management.indexPattern.edit.fields.table.isExcluded.aria', defaultMessage: 'Is excluded' })),
      },
      {
        name: '',
        actions: [
          {
            name: intl.formatMessage({ id: 'kbn.management.indexPattern.edit.fields.table.edit.label', defaultMessage: 'Edit' }),
            description: intl.formatMessage({
              id: 'kbn.management.indexPattern.edit.fields.table.edit.description', defaultMessage: 'Edit' }),
            icon: 'pencil',
            onClick: editField,
            type: 'icon',
          },
        ],
        width: '40px',
      }
    ]);

    return (
      <I18nContext>
        {intl => {
          const columns = getColumns(intl);
          return (
            <EuiInMemoryTable
              items={items}
              columns={columns}
              pagination={pagination}
              sorting={true}
            />
          );
        }}
      </I18nContext>
    );
  }
}
