/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiCallOut,
  EuiDataGridCustomToolbarProps,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactElement } from 'react';
import type { UnifiedDataTableRenderCustomToolbar } from '../data_table';

export const renderComparisonToolbar = ({
  renderCustomToolbar,
  additionalControls,
  comparisonFields,
  totalFields,
}: {
  renderCustomToolbar?: UnifiedDataTableRenderCustomToolbar;
  additionalControls: ReactElement;
  comparisonFields: string[];
  totalFields: number;
}) => {
  return (toolbarProps: EuiDataGridCustomToolbarProps) => {
    const { euiTheme } = useEuiTheme();

    let toolbar: ReactElement;

    if (renderCustomToolbar) {
      toolbar = renderCustomToolbar({
        toolbarProps,
        gridProps: { additionalControls },
      });
    } else {
      toolbar = (
        <div
          className="euiDataGrid__controls"
          css={{ paddingLeft: `${euiTheme.size.s} !important` }}
        >
          <div className="euiDataGrid__leftControls">{additionalControls}</div>
          {toolbarProps.hasRoomForGridControls && (
            <div className="euiDataGrid__rightControls">
              {toolbarProps.keyboardShortcutsControl}
              {toolbarProps.fullScreenControl}
            </div>
          )}
        </div>
      );
    }

    return (
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>{toolbar}</EuiFlexItem>
        {totalFields > comparisonFields.length && (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              size="s"
              iconType="iInCircle"
              title={i18n.translate('unifiedDataTable.comparisonMaxFieldsCallout', {
                defaultMessage:
                  'Comparison is limited to {comparisonFields} of {totalFields} fields.',
                values: { comparisonFields: comparisonFields.length, totalFields },
              })}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };
};
