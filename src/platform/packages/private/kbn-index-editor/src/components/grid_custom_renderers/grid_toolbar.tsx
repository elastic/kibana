/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { UnifiedDataTableRenderCustomToolbarProps } from '@kbn/unified-data-table';
import type { EditLookupIndexContentContext } from '../../types';
import { QueryBar } from '../query_bar';

interface CustomToolBarProps {
  rowsCount?: number;
  onOpenIndexInDiscover?: EditLookupIndexContentContext['onOpenIndexInDiscover'];
}

export const getGridToolbar =
  ({ rowsCount, onOpenIndexInDiscover }: CustomToolBarProps) =>
  ({ gridProps: { additionalControls } }: UnifiedDataTableRenderCustomToolbarProps) => {
    const { euiTheme } = useEuiTheme();

    return (
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="s"
        css={{ marginBottom: euiTheme.size.m }}
      >
        <EuiFlexGroup gutterSize="l" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="s" data-test-subj="indexEditorRowCount">
              <strong>
                <FormattedMessage
                  id="indexEditor.toolbar.rowCountLabel"
                  defaultMessage="{rowsCount, plural, one {# row} other {# rows}}"
                  values={{ rowsCount }}
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {additionalControls && <EuiFlexItem grow={false}>{additionalControls}</EuiFlexItem>}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <QueryBar onOpenIndexInDiscover={onOpenIndexInDiscover} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };
