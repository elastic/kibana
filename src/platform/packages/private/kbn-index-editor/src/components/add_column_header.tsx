/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFieldText, EuiButtonEmpty, EuiForm, EuiToolTip, useEuiTheme } from '@elastic/eui';
import React, { useState, KeyboardEvent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAddColumnName } from '../hooks/use_add_column_name';

interface AddColumnHeaderProps {
  initialColumnName?: string;
}

export const AddColumnHeader = ({ initialColumnName }: AddColumnHeaderProps) => {
  const { euiTheme } = useEuiTheme();
  const { columnName, setColumnName, saveColumn, validationError } =
    useAddColumnName(initialColumnName);

  const [isEditing, setIsEditing] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validationError) {
      await saveColumn();
      setColumnName('');
      setIsEditing(false);
    }
  };

  const columnLabel = initialColumnName || (
    <FormattedMessage id="indexEditor.flyout.grid.columnHeader.add" defaultMessage="Add a field…" />
  );

  if (isEditing) {
    return (
      <EuiForm component="form" onSubmit={onSubmit}>
        <EuiToolTip
          position="top"
          content={validationError}
          anchorProps={{ css: { width: '100%' } }}
        >
          <EuiFieldText
            value={columnName}
            autoFocus
            fullWidth
            controlOnly
            compressed
            required
            isInvalid={!!validationError}
            onChange={(e) => {
              setColumnName(e.target.value);
            }}
            onBlur={() => {
              setIsEditing(false);
            }}
            onKeyDown={(e: KeyboardEvent) => {
              e.stopPropagation();
              if (e.key === 'Escape') {
                setIsEditing(false);
              }
            }}
          />
        </EuiToolTip>
      </EuiForm>
    );
  }

  return (
    <EuiButtonEmpty
      css={{
        color: euiTheme.colors.textSubdued,
        width: '100%',
      }}
      flush="left"
      contentProps={{
        css: {
          justifyContent: 'left',
        },
      }}
      onClick={() => setIsEditing(true)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Enter') setIsEditing(true);
      }}
    >
      {columnLabel}
    </EuiButtonEmpty>
  );
};
