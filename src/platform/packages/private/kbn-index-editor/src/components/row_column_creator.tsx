/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiButton, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { ValueInput } from './value_input';

type ToggleMode = 'add-row' | 'add-column';

export const RowColumnCreator = ({ columns }: { columns: DatatableColumn[] }) => {
  const [activeMode, setActiveMode] = useState<ToggleMode | null>(null);

  const toggleAddRow = () => {
    setActiveMode('add-row');
  };

  const toggleAddColumn = () => {
    setActiveMode('add-column');
  };

  const inputs = columns.map((column) => {
    return <ValueInput placeholder={column.name} />;
  });

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={toggleAddRow}
            iconType="plusInCircle"
            size="s"
            disabled={activeMode === 'add-row'}
          >
            {i18n.translate('indexEditor.addRow', {
              defaultMessage: 'Add row',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={toggleAddColumn}
            iconType="plusInCircle"
            size="s"
            disabled={activeMode === 'add-column'}
          >
            {i18n.translate('indexEditor.addColumn', {
              defaultMessage: 'Add column',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexGroup gutterSize="s">{inputs}</EuiFlexGroup>
        <EuiButtonIcon
          onClick={() => {}}
          iconType="check"
          display="base"
          color="success"
          aria-label="Save"
        />
        <EuiButtonIcon
          onClick={() => {}}
          iconType="cross"
          display="base"
          color="danger"
          aria-label="Cancel"
        />
      </EuiFlexGroup>
    </>
  );
};
