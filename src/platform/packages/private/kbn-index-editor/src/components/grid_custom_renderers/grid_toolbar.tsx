/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { UnifiedDataTableRenderCustomToolbarProps } from '@kbn/unified-data-table';
import type { EditIndexContentContext } from '../../types';
import { QueryBar } from '../query_bar';

interface CustomToolBarProps {
  rowsCount?: number;
  /** The last fetch hit the per-fetch row cap, so the grid shows only a partial window. */
  isCapped?: boolean;
  /** Total documents matching the current filter; used to show "first N of M" while capped. */
  totalDocsCount?: number;
  onOpenIndexInDiscover?: EditIndexContentContext['onOpenIndexInDiscover'];
  fieldsSelector?: React.ReactNode;
}

export const getGridToolbar =
  ({
    rowsCount,
    isCapped,
    totalDocsCount,
    onOpenIndexInDiscover,
    fieldsSelector,
  }: CustomToolBarProps) =>
  ({ gridProps: { additionalControls } }: UnifiedDataTableRenderCustomToolbarProps) => {
    const { euiTheme } = useEuiTheme();

    // Show the true total only when it is actually larger than the loaded window; otherwise the
    // loaded rows already represent everything that matches.
    const showTotal = isCapped && totalDocsCount !== undefined && totalDocsCount > (rowsCount ?? 0);

    return (
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="s"
        css={{ marginBottom: euiTheme.size.m }}
      >
        <EuiFlexGroup gutterSize="l" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s" data-test-subj="indexEditorRowCount">
                  <strong>
                    {showTotal ? (
                      <FormattedMessage
                        id="indexEditor.toolbar.rowCountCappedWithTotalLabel"
                        defaultMessage="{rowsCount, number} of {totalDocsCount, number} rows"
                        values={{ rowsCount, totalDocsCount }}
                      />
                    ) : isCapped ? (
                      <FormattedMessage
                        id="indexEditor.toolbar.rowCountCappedLabel"
                        defaultMessage="{rowsCount, number} rows"
                        values={{ rowsCount }}
                      />
                    ) : (
                      <FormattedMessage
                        id="indexEditor.toolbar.rowCountLabel"
                        defaultMessage="{rowsCount, plural, one {# row} other {# rows}}"
                        values={{ rowsCount }}
                      />
                    )}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              {isCapped && (
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    type="info"
                    color="subdued"
                    size="m"
                    data-test-subj="indexEditorRowCountCappedTip"
                    aria-label={i18n.translate(
                      'indexEditor.toolbar.rowCountCappedTooltipAriaLabel',
                      {
                        defaultMessage: 'Why only some rows are shown',
                      }
                    )}
                    content={i18n.translate('indexEditor.toolbar.rowCountCappedTooltip', {
                      defaultMessage:
                        'Only a subset of rows is loaded for editing. Use the search bar and column sorting to find the rows you need.',
                    })}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {fieldsSelector && <EuiFlexItem grow={false}>{fieldsSelector}</EuiFlexItem>}
          <EuiFlexItem grow={false}>
            {additionalControls && <EuiFlexItem grow={false}>{additionalControls}</EuiFlexItem>}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem grow={false} css={{ width: '50%' }}>
          <QueryBar onOpenIndexInDiscover={onOpenIndexInDiscover} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };
