/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBasicTableColumn, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldName } from '../../../../../components/field_name/field_name';
import { TableActions } from './table_cell_actions';
import { TableFieldValue } from '../table_cell_value';
import { FieldRecordLegacy } from '../../../doc_views_types';

export const ACTIONS_COLUMN: EuiBasicTableColumn<FieldRecordLegacy> = {
  field: 'action',
  className: 'kbnDocViewer__tableActionsCell',
  width: '108px',
  mobileOptions: { header: false },
  name: (
    <EuiText size="xs">
      <strong>
        <FormattedMessage
          id="discover.fieldChooser.discoverField.actions"
          defaultMessage="Actions"
        />
      </strong>
    </EuiText>
  ),
  render: (
    { flattenedField, isActive, onFilter, onToggleColumn }: FieldRecordLegacy['action'],
    { field: { field, fieldMapping }, value: { ignored } }: FieldRecordLegacy
  ) => {
    return (
      <TableActions
        isActive={isActive}
        field={field}
        fieldMapping={fieldMapping}
        flattenedField={flattenedField}
        onFilter={onFilter!}
        onToggleColumn={onToggleColumn}
        ignoredValue={!!ignored}
      />
    );
  },
};
export const MAIN_COLUMNS: Array<EuiBasicTableColumn<FieldRecordLegacy>> = [
  {
    field: 'field',
    className: 'kbnDocViewer__tableFieldNameCell',
    mobileOptions: { header: false },
    width: '30%',
    name: (
      <EuiText size="xs">
        <strong>
          <FormattedMessage id="discover.fieldChooser.discoverField.name" defaultMessage="Field" />
        </strong>
      </EuiText>
    ),
    render: ({
      field,
      fieldType,
      displayName,
      fieldMapping,
      scripted,
    }: FieldRecordLegacy['field']) => {
      return field ? (
        <FieldName
          fieldName={displayName}
          fieldType={fieldType}
          fieldMapping={fieldMapping}
          scripted={scripted}
        />
      ) : (
        <span>&nbsp;</span>
      );
    },
  },
  {
    field: 'value',
    className: 'kbnDocViewer__tableValueCell',
    mobileOptions: { header: false },
    name: (
      <EuiText size="xs">
        <strong>
          <FormattedMessage id="discover.fieldChooser.discoverField.value" defaultMessage="Value" />
        </strong>
      </EuiText>
    ),
    render: (
      { formattedValue, ignored }: FieldRecordLegacy['value'],
      { field: { field }, action: { flattenedField } }: FieldRecordLegacy
    ) => {
      return (
        <TableFieldValue
          field={field}
          formattedValue={formattedValue}
          rawValue={flattenedField}
          ignoreReason={ignored}
        />
      );
    },
  },
];
