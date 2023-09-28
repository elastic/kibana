/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';
import './render_custom_toolbar.scss';

export const renderCustomToolbar: UnifiedDataTableProps['renderCustomToolbar'] = (
  {
    columnControl,
    columnSortingControl,
    fullScreenControl,
    keyboardShortcutsControl,
    displayControl,
  },
  { totalHits }
) => {
  return (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="spaceBetween"
      alignItems="center"
      className="dscGridToolbar"
    >
      <EuiFlexItem grow={false}>
        {typeof totalHits === 'number' && (
          <EuiText data-test-subj="dscGridTotalHits" className="euiTextTruncate" size="s">
            <strong>
              <FormattedMessage
                id="dscGrid.totalHitsLabel"
                defaultMessage="{totalHitsFormatted} {totalHits, plural, one {document} other {documents}}"
                values={{
                  totalHits,
                  totalHitsFormatted: (
                    <FormattedNumber value={totalHits} data-test-subj="dscGridTotalHits" />
                  ),
                }}
              />
            </strong>
          </EuiText>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
          {columnControl && (
            <EuiFlexItem grow={false}>
              <div className="dscGridToolbarControlGroup">
                <div className="dscGridToolbarControl">{columnControl}</div>
              </div>
            </EuiFlexItem>
          )}
          {columnSortingControl && (
            <EuiFlexItem grow={false}>
              <div className="dscGridToolbarControlGroup">
                <div className="dscGridToolbarControl">{columnSortingControl}</div>
              </div>
            </EuiFlexItem>
          )}
          {(keyboardShortcutsControl || displayControl || fullScreenControl) && (
            <EuiFlexItem grow={false}>
              <div className="dscGridToolbarControlGroup">
                {keyboardShortcutsControl && (
                  <div className="dscGridToolbarControl">{keyboardShortcutsControl}</div>
                )}
                {displayControl && <div className="dscGridToolbarControl">{displayControl}</div>}
                {fullScreenControl && (
                  <div className="dscGridToolbarControl">{fullScreenControl}</div>
                )}
              </div>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
