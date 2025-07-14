/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFieldText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAddColumnName } from '../hooks/use_add_column_name';

export const AddColumnHeader = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { columnName, setColumnName, saveNewColumn } = useAddColumnName();

  const submit = async () => {
    if (!columnName.trim()) {
      setIsEditing(false);
      setColumnName('');
      return;
    }
    if (await saveNewColumn()) {
      setColumnName('');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <EuiFieldText
        value={columnName}
        autoFocus
        compressed
        onChange={(e) => {
          setColumnName(e.target.value);
        }}
        onBlur={() => {
          setIsEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            submit();
          }
        }}
      />
    );
  }

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} style={{ height: '100%', width: '100%' }}>
      <EuiFlexItem>
        <div
          tabIndex={0}
          style={{
            cursor: 'pointer',
            height: '100%',
            width: '100%',
          }}
          onClick={() => setIsEditing(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsEditing(true);
          }}
        >
          <FormattedMessage
            id="indexEditor.flyout.grid.columnHeader.default"
            defaultMessage="Add a field…"
          />
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
