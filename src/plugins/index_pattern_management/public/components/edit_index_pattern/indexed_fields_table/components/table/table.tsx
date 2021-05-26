/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PureComponent } from 'react';

import {
  EuiIcon,
  EuiInMemoryTable,
  EuiIconTip,
  EuiBasicTableColumn,
  EuiBadge,
  EuiToolTip,
} from '@elastic/eui';

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

const deleteLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.deleteLabel',
  {
    defaultMessage: 'Delete',
  }
);

const deleteDescription = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.deleteDescription',
  { defaultMessage: 'Delete' }
);

const labelDescription = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.customLabelTooltip',
  { defaultMessage: 'A custom label for the field.' }
);

const runtimeIconTipTitle = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.runtimeIconTipTitle',
  { defaultMessage: 'Runtime field' }
);

const runtimeIconTipText = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.table.runtimeIconTipText',
  { defaultMessage: 'This field exists on the index pattern only.' }
);

interface IndexedFieldProps {
  indexPattern: IIndexPattern;
  items: IndexedFieldItem[];
  editField: (field: IndexedFieldItem) => void;
  deleteField: (fieldName: string) => void;
}

export const renderFieldName = (field: IndexedFieldItem, timeFieldName?: string) => (
  <span>
    {field.name}
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
    {timeFieldName === field.name ? (
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
    {!field.isMapped && field.hasRuntime ? (
      <span>
        &nbsp;
        <EuiIconTip
          type="indexRuntime"
          title={runtimeIconTipTitle}
          content={<span>{runtimeIconTipText}</span>}
        />
      </span>
    ) : null}
    {field.customLabel && field.customLabel !== field.name ? (
      <div>
        <EuiToolTip content={labelDescription}>
          <EuiBadge iconType="flag" iconSide="left">
            {field.customLabel}
          </EuiBadge>
        </EuiToolTip>
      </div>
    ) : null}
  </span>
);

export class Table extends PureComponent<IndexedFieldProps> {
  renderBooleanTemplate(value: string, arialLabel: string) {
    return value ? <EuiIcon type="dot" color="secondary" aria-label={arialLabel} /> : <span />;
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
    const { items, editField, deleteField, indexPattern } = this.props;

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
          return renderFieldName(field, indexPattern.timeFieldName);
        },
        width: '38%',
        'data-test-subj': 'indexedFieldName',
      },
      {
        field: 'type',
        name: typeHeader,
        dataType: 'string',
        sortable: true,
        render: (value: string, field: IndexedFieldItem) => {
          return this.renderFieldType(value, field.kbnType === 'conflict');
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
      {
        name: '',
        actions: [
          {
            name: deleteLabel,
            description: deleteDescription,
            icon: 'trash',
            onClick: (field) => deleteField(field.name),
            type: 'icon',
            'data-test-subj': 'deleteField',
            available: (field) => !field.isMapped,
          },
        ],
        width: '40px',
      },
    ];

    return (
      <EuiInMemoryTable
        items={items}
        columns={columns}
        pagination={pagination}
        sorting={{ sort: { field: 'displayName', direction: 'asc' } }}
      />
    );
  }
}
