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

import { injectI18n } from '@kbn/i18n/react';

export class TableComponent extends PureComponent {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    items: PropTypes.array.isRequired,
    editField: PropTypes.func.isRequired
  }

  renderBooleanTemplate(value, label) {
    return value ? <EuiIcon type="dot" color="secondary" aria-label={label}/> : <span/>;
  }

  renderFieldName(name, field) {
    const { indexPattern } = this.props;
    const { intl } = this.props;

    const infoLabel = intl.formatMessage({
      id: 'kbn.management.editIndexPattern.fields.table.additionalInfoAriaLabel',
      defaultMessage: 'Additional field information'
    });
    const timeLabel = intl.formatMessage({
      id: 'kbn.management.editIndexPattern.fields.table.primaryTimeAriaLabel',
      defaultMessage: 'Primary time field'
    });
    const timeContent = intl.formatMessage({
      id: 'kbn.management.editIndexPattern.fields.table.primaryTimeTooltip',
      defaultMessage: 'This field represents the time that events occurred.'
    });

    return (
      <span>
        {name}
        {field.info && field.info.length ? (
          <span>
            &nbsp;
            <EuiIconTip
              type="questionInCircle"
              color="primary"
              aria-label={infoLabel}
              content={field.info.map((info, i) => <div key={i}>{info}</div>)}
            />
          </span>
        ) : null}
        {indexPattern.timeFieldName === name ? (
          <span>
            &nbsp;
            <EuiIconTip
              type="clock"
              color="primary"
              aria-label={timeLabel}
              content={timeContent}
            />
          </span>
        ) : null}
      </span>
    );
  }

  renderFieldType(type, isConflict) {
    const { intl } = this.props;
    const label = intl.formatMessage({
      id: 'kbn.management.editIndexPattern.fields.table.multiTypeAria',
      defaultMessage: 'Multiple type field'
    });
    const content = intl.formatMessage({
      id: 'kbn.management.editIndexPattern.fields.table.multiTypeTooltip',
      defaultMessage: 'The type of this field changes across indices. It is unavailable for many analysis functions.'
    });

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
    const { items, editField, intl } = this.props;

    const pagination = {
      initialPageSize: 10,
      pageSizeOptions: [5, 10, 25, 50]
    };

    const columns = [
      {
        field: 'displayName',
        name: intl.formatMessage({ id: 'kbn.management.editIndexPattern.fields.table.nameHeader', defaultMessage: 'Name' }),
        dataType: 'string',
        sortable: true,
        render: (value, field) => {
          return this.renderFieldName(value, field);
        },
        width: '38%',
        'data-test-subj': 'indexedFieldName',
      },
      {
        field: 'type',
        name: intl.formatMessage({ id: 'kbn.management.editIndexPattern.fields.table.typeHeader', defaultMessage: 'Type' }),
        dataType: 'string',
        sortable: true,
        render: (value) => {
          return this.renderFieldType(value, value === 'conflict');
        },
        'data-test-subj': 'indexedFieldType',
      },
      {
        field: 'format',
        name: intl.formatMessage({ id: 'kbn.management.editIndexPattern.fields.table.formatHeader', defaultMessage: 'Format' }),
        dataType: 'string',
        sortable: true,
      },
      {
        field: 'searchable',
        name: intl.formatMessage({ id: 'kbn.management.editIndexPattern.fields.table.searchableHeader', defaultMessage: 'Searchable' }),
        description: intl.formatMessage({
          id: 'kbn.management.editIndexPattern.fields.table.searchableDescription',
          defaultMessage: 'These fields can be used in the filter bar' }),
        dataType: 'boolean',
        sortable: true,
        render: (value) => this.renderBooleanTemplate(value, intl.formatMessage({
          id: 'kbn.management.editIndexPattern.fields.table.isSearchableAria', defaultMessage: 'Is searchable' })),
      },
      {
        field: 'aggregatable',
        name: intl.formatMessage({
          id: 'kbn.management.editIndexPattern.fields.table.aggregatableLabel', defaultMessage: 'Aggregatable' }),
        description: intl.formatMessage({
          id: 'kbn.management.editIndexPattern.fields.table.aggregatableDescription',
          defaultMessage: 'These fields can be used in visualization aggregations' }),
        dataType: 'boolean',
        sortable: true,
        render: (value) => this.renderBooleanTemplate(value, intl.formatMessage({
          id: 'kbn.management.editIndexPattern.fields.table.isAggregatableAria', defaultMessage: 'Is aggregatable' })),
      },
      {
        field: 'excluded',
        name: intl.formatMessage({ id: 'kbn.management.editIndexPattern.fields.table.excludedLabel', defaultMessage: 'Excluded' }),
        description: intl.formatMessage({
          id: 'kbn.management.editIndexPattern.fields.table.excludedDescription',
          defaultMessage: 'Fields that are excluded from _source when it is fetched' }),
        dataType: 'boolean',
        sortable: true,
        render: (value) => this.renderBooleanTemplate(value, intl.formatMessage({
          id: 'kbn.management.editIndexPattern.fields.table.isExcludedAria', defaultMessage: 'Is excluded' })),
      },
      {
        name: '',
        actions: [
          {
            name: intl.formatMessage({ id: 'kbn.management.editIndexPattern.fields.table.editLabel', defaultMessage: 'Edit' }),
            description: intl.formatMessage({
              id: 'kbn.management.editIndexPattern.fields.table.editDescription', defaultMessage: 'Edit' }),
            icon: 'pencil',
            onClick: editField,
            type: 'icon',
          },
        ],
        width: '40px',
      }
    ];

    return (
      <EuiInMemoryTable
        items={items}
        columns={columns}
        pagination={pagination}
        sorting={true}
      />
    );
  }
}

export const Table = injectI18n(TableComponent);
