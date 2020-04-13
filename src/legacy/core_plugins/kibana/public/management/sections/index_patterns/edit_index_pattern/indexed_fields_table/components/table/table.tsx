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

import { IIndexPattern } from '../../../../../../../../../../../plugins/data/public';
import { IndexedFieldItem } from '../../types';

// localized labels
const infoLabel = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.additionalInfoAriaLabel',
  { defaultMessage: 'Additional field information' }
);

const timeLabel = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.primaryTimeAriaLabel',
  { defaultMessage: 'Primary time field' }
);

const timeContent = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.primaryTimeTooltip',
  { defaultMessage: 'This field represents the time that events occurred.' }
);

const label = i18n.translate('kbn.management.editIndexPattern.fields.table.multiTypeAria', {
  defaultMessage: 'Multiple type field',
});

const content = i18n.translate('kbn.management.editIndexPattern.fields.table.multiTypeTooltip', {
  defaultMessage:
    'The type of this field changes across indices. It is unavailable for many analysis functions.',
});

const displayNameColumn = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.nameHeader',
  {
    defaultMessage: 'Name',
  }
);

const typeNameColumn = i18n.translate('kbn.management.editIndexPattern.fields.table.typeHeader', {
  defaultMessage: 'Type',
});

const formatNameColumn = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.formatHeader',
  {
    defaultMessage: 'Format',
  }
);

const searchableNameColumn = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.searchableHeader',
  {
    defaultMessage: 'Searchable',
  }
);

const searchableDescriptionColumn = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.searchableDescription',
  { defaultMessage: 'These fields can be used in the filter bar' }
);

const isSearchableLabel = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.isSearchableAria',
  {
    defaultMessage: 'Is searchable',
  }
);

const aggregatableNameColumn = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.aggregatableLabel',
  {
    defaultMessage: 'Aggregatable',
  }
);

const aggregatableDescriptionColumn = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.aggregatableDescription',
  { defaultMessage: 'These fields can be used in visualization aggregations' }
);

const isAggregatableLabel = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.isAggregatableAria',
  {
    defaultMessage: 'Is aggregatable',
  }
);

const excludedNameColumn = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.excludedLabel',
  {
    defaultMessage: 'Excluded',
  }
);

const excludedDescriptionColumn = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.excludedDescription',
  { defaultMessage: 'Fields that are excluded from _source when it is fetched' }
);

const isExcludedLabel = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.isExcludedAria',
  {
    defaultMessage: 'Is excluded',
  }
);

const editNameAction = i18n.translate('kbn.management.editIndexPattern.fields.table.editLabel', {
  defaultMessage: 'Edit',
});

const editDescriptionAction = i18n.translate(
  'kbn.management.editIndexPattern.fields.table.editDescription',
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
              aria-label={infoLabel}
              content={field.info.map((info: string, i: number) => (
                <div key={i}>{info}</div>
              ))}
            />
          </span>
        ) : null}
        {indexPattern.timeFieldName === name ? (
          <span>
            &nbsp;
            <EuiIconTip type="clock" color="primary" aria-label={timeLabel} content={timeContent} />
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
            <EuiIconTip type="alert" color="warning" aria-label={label} content={content} />
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
        name: displayNameColumn,
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
        name: typeNameColumn,
        dataType: 'string',
        sortable: true,
        render: (value: string) => {
          return this.renderFieldType(value, value === 'conflict');
        },
        'data-test-subj': 'indexedFieldType',
      },
      {
        field: 'format',
        name: formatNameColumn,
        dataType: 'string',
        sortable: true,
      },
      {
        field: 'searchable',
        name: searchableNameColumn,
        description: searchableDescriptionColumn,
        dataType: 'boolean',
        sortable: true,
        render: (value: string) => this.renderBooleanTemplate(value, isSearchableLabel),
      },
      {
        field: 'aggregatable',
        name: aggregatableNameColumn,
        description: aggregatableDescriptionColumn,
        dataType: 'boolean',
        sortable: true,
        render: (value: string) => this.renderBooleanTemplate(value, isAggregatableLabel),
      },
      {
        field: 'excluded',
        name: excludedNameColumn,
        description: excludedDescriptionColumn,
        dataType: 'boolean',
        sortable: true,
        render: (value: string) => this.renderBooleanTemplate(value, isExcludedLabel),
      },
      {
        name: '',
        actions: [
          {
            name: editNameAction,
            description: editDescriptionAction,
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
