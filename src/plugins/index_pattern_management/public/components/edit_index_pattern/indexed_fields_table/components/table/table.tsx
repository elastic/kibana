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

import { EuiIcon, EuiInMemoryTable, EuiIconTip, EuiBasicTableColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { IIndexPattern } from '../../../../../../../data/public';
import { IndexedFieldItem } from '../../types';

// localized labels
const additionalInfoAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.additionalInfoAriaLabel',
  { defaultMessage: 'Additional field information' }
);

const primaryTimeAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.primaryTimeAriaLabel',
  { defaultMessage: 'Primary time field' }
);

const primaryTimeTooltip = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.primaryTimeTooltip',
  { defaultMessage: 'This field represents the time that events occurred.' }
);

const multiTypeAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.multiTypeAria',
  {
    defaultMessage: 'Multiple type field',
  }
);

const multiTypeTooltip = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.multiTypeTooltip',
  {
    defaultMessage:
      'The type of this field changes across indices. It is unavailable for many analysis functions.',
  }
);

const nameHeader = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.nameHeader',
  {
    defaultMessage: 'Name',
  }
);

const typeHeader = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.typeHeader',
  {
    defaultMessage: 'Type',
  }
);

const formatHeader = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.formatHeader',
  {
    defaultMessage: 'Format',
  }
);

const searchableHeader = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.searchableHeader',
  {
    defaultMessage: 'Searchable',
  }
);

const searchableDescription = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.searchableDescription',
  { defaultMessage: 'These fields can be used in the filter bar' }
);

const isSearchableAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.isSearchableAria',
  {
    defaultMessage: 'Is searchable',
  }
);

const aggregatableLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.aggregatableLabel',
  {
    defaultMessage: 'Aggregatable',
  }
);

const aggregatableDescription = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.aggregatableDescription',
  { defaultMessage: 'These fields can be used in visualization aggregations' }
);

const isAggregatableAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.isAggregatableAria',
  {
    defaultMessage: 'Is aggregatable',
  }
);

const excludedLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.excludedLabel',
  {
    defaultMessage: 'Excluded',
  }
);

const excludedDescription = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.excludedDescription',
  { defaultMessage: 'Fields that are excluded from _source when it is fetched' }
);

const isExcludedAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.isExcludedAria',
  {
    defaultMessage: 'Is excluded',
  }
);

const editLabel = i18n.translate('indexPatternManagement.editIndexPattern.fields.table.editLabel', {
  defaultMessage: 'Edit',
});

const editDescription = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.editDescription',
  { defaultMessage: 'Edit' }
);

interface IndexedFieldProps {
  indexPattern: IIndexPattern;
  items: IndexedFieldItem[];
  editField: (field: IndexedFieldItem) => void;
}

export class Table extends PureComponent<IndexedFieldProps> {
  renderBooleanTemplate(value: string, arialLabel: string) {
    return value ? <EuiIcon type="dot" color="secondary" aria-label={arialLabel} /> : <span />;
  }

  renderFieldName(name: string, field: IndexedFieldItem) {
    const { indexPattern } = this.props;

    return (
      <span>
        {name}
        {field.info && field.info.length ? (
          <span>
            &nbsp;
            <EuiIconTip
              type="questionInCircle"
              color="primary"
              aria-label={additionalInfoAriaLabel}
              content={field.info.map((info: string, i: number) => (
                <div key={i}>{info}</div>
              ))}
            />
          </span>
        ) : null}
        {indexPattern.timeFieldName === name ? (
          <span>
            &nbsp;
            <EuiIconTip
              type="clock"
              color="primary"
              aria-label={primaryTimeAriaLabel}
              content={primaryTimeTooltip}
            />
          </span>
        ) : null}
      </span>
    );
  }

  renderFieldType(type: string, isConflict: boolean) {
    return (
      <span>
        {type}
        {isConflict ? (
          <span>
            &nbsp;
            <EuiIconTip
              type="alert"
              color="warning"
              aria-label={multiTypeAriaLabel}
              content={multiTypeTooltip}
            />
          </span>
        ) : (
          ''
        )}
      </span>
    );
  }

  render() {
    const { items, editField } = this.props;

    const pagination = {
      initialPageSize: 10,
      pageSizeOptions: [5, 10, 25, 50],
    };

    const columns: Array<EuiBasicTableColumn<IndexedFieldItem>> = [
      {
        field: 'displayName',
        name: nameHeader,
        dataType: 'string',
        sortable: true,
        render: (value: string, field: IndexedFieldItem) => {
          return this.renderFieldName(value, field);
        },
        width: '38%',
        'data-test-subj': 'indexedFieldName',
      },
      {
        field: 'type',
        name: typeHeader,
        dataType: 'string',
        sortable: true,
        render: (value: string) => {
          return this.renderFieldType(value, value === 'conflict');
        },
        'data-test-subj': 'indexedFieldType',
      },
      {
        field: 'format',
        name: formatHeader,
        dataType: 'string',
        sortable: true,
      },
      {
        field: 'searchable',
        name: searchableHeader,
        description: searchableDescription,
        dataType: 'boolean',
        sortable: true,
        render: (value: string) => this.renderBooleanTemplate(value, isSearchableAriaLabel),
      },
      {
        field: 'aggregatable',
        name: aggregatableLabel,
        description: aggregatableDescription,
        dataType: 'boolean',
        sortable: true,
        render: (value: string) => this.renderBooleanTemplate(value, isAggregatableAriaLabel),
      },
      {
        field: 'excluded',
        name: excludedLabel,
        description: excludedDescription,
        dataType: 'boolean',
        sortable: true,
        render: (value: string) => this.renderBooleanTemplate(value, isExcludedAriaLabel),
      },
      {
        name: '',
        actions: [
          {
            name: editLabel,
            description: editDescription,
            icon: 'pencil',
            onClick: editField,
            type: 'icon',
            'data-test-subj': 'editFieldFormat',
          },
        ],
        width: '40px',
      },
    ];

    return (
      <EuiInMemoryTable items={items} columns={columns} pagination={pagination} sorting={true} />
    );
  }
}
