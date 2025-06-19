/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
  useEuiTheme,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KibanaContextExtra } from '../types';
import { ValueInput } from './value_input';

type ToggleMode = 'add-row' | 'add-column';

export const RowColumnCreator = ({ columns }: { columns: DatatableColumn[] }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { indexUpdateService },
  } = useKibana<KibanaContextExtra>();

  const [activeMode, setActiveMode] = useState<ToggleMode | null>(null);

  const toggleAddRow = () => {
    setActiveMode('add-row');
  };

  const toggleAddColumn = () => {
    setActiveMode('add-column');
  };

  const cancelAction = () => {
    setActiveMode(null);
  };

  const [newRow, setNewRow] = useState<Record<string, unknown>>({});

  const updateRow = useCallback(
    (columnId: string) => (value: unknown) => {
      setNewRow((prev) => ({
        ...prev,
        [columnId]: value,
      }));
    },
    [setNewRow]
  );

  const inputs = useMemo(
    () =>
      columns.map((column) => {
        return <ValueInput placeholder={column.name} onChange={updateRow(column.id)} />;
      }),
    [columns, updateRow]
  );

  const saveNewRow = () => {
    indexUpdateService.addDoc(newRow);
    setActiveMode(null);
  };

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={toggleAddRow}
            iconType="plusInCircle"
            size="s"
            disabled={activeMode === 'add-row'}
          >
            {i18n.translate('indexEditor.addRow', {
              defaultMessage: 'Add row',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={toggleAddColumn}
            iconType="plusInCircle"
            size="s"
            disabled={activeMode === 'add-column'}
          >
            {i18n.translate('indexEditor.addColumn', {
              defaultMessage: 'Add column',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {activeMode === 'add-row' && (
        <EuiPanel
          paddingSize="s"
          css={css`
            background: ${euiTheme.colors.backgroundBaseSubdued};
            margin-bottom: ${euiTheme.size.xs};
          `}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexGroup gutterSize="s">{inputs}</EuiFlexGroup>
            <EuiButtonIcon
              onClick={saveNewRow}
              iconType="check"
              display="base"
              color="success"
              aria-label="Save"
            />
            <EuiButtonIcon
              onClick={cancelAction}
              iconType="cross"
              display="base"
              color="danger"
              aria-label="Cancel"
            />
          </EuiFlexGroup>
        </EuiPanel>
      )}
    </>
  );
};
