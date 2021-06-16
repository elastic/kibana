/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBasicTableColumn, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { FieldName } from '../field_name/field_name';
import { FieldRecord } from './table';
import { TableActions } from './table_cell_actions';
import { TableFieldValue } from './table_cell_value';

export const DOC_VIEW_COLUMNS: Array<EuiBasicTableColumn<FieldRecord>> = [
  {
    field: 'field',
    name: (
      <EuiText size="xs">
        <strong>
          <FormattedMessage id="discover.fieldChooser.discoverField.name" defaultMessage="Field" />
        </strong>
      </EuiText>
    ),
    render: ({ fieldName, fieldType, fieldMapping, scripted }: FieldRecord['field']) => {
      return (
        <FieldName
          fieldName={fieldName}
          fieldType={fieldType}
          fieldMapping={fieldMapping}
          scripted={scripted}
          className="kbnDocViewer__fieldNameCell"
        />
      );
    },
  },
  {
    field: 'value',
    name: (
      <EuiText size="xs">
        <strong>
          <FormattedMessage id="discover.fieldChooser.discoverField.value" defaultMessage="Value" />
        </strong>
      </EuiText>
    ),
    render: (
      { formattedField }: FieldRecord['value'],
      { field: { fieldName, fieldMapping } }: FieldRecord
    ) => {
      return (
        <TableFieldValue
          formattedField={formattedField}
          fieldName={fieldName}
          fieldMapping={fieldMapping}
        />
      );
    },
  },
  {
    field: 'action',
    width: '108px',
    name: (
      <EuiText size="xs">
        <strong>
          <FormattedMessage
            id="discover.fieldChooser.discoverField.action"
            defaultMessage="Action"
          />
        </strong>
      </EuiText>
    ),
    render: (
      { flattenedField, isActive, onFilter, onToggleColumn }: FieldRecord['action'],
      { field: { fieldName, fieldMapping } }: FieldRecord
    ) => {
      return (
        onFilter && (
          <TableActions
            isActive={isActive}
            fieldName={fieldName}
            fieldMapping={fieldMapping}
            flattenedField={flattenedField}
            onFilter={onFilter}
            onToggleColumn={onToggleColumn}
          />
        )
      );
    },
  },
];
