/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  type EuiDataGridStyle,
  type EuiResizeObserverProps,
  EuiIconTip,
  EuiResizeObserver,
  EuiScreenReaderOnly,
  mathWithUnits,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import ColumnHeaderTruncateContainer from '../../column_header_truncate_container';

export interface ActionsHeaderProps {
  maxWidth: number;
  cellPadding?: EuiDataGridStyle['cellPadding'];
}

export const ActionsHeader = ({ maxWidth, cellPadding = 's' }: ActionsHeaderProps) => {
  const { euiTheme } = useEuiTheme();
  const [showText, setShowText] = useState(false);

  // Mirrors EUI's internal cellPadding -> size mapping (data_grid.styles.ts).
  // Header cell applies the value on all sides, so horizontal padding = 2 * value.
  const horizontalPaddingPx = useMemo(() => {
    const resolved =
      cellPadding === 'l'
        ? euiTheme.size.s
        : cellPadding === 'm'
        ? mathWithUnits(euiTheme.size.m, (x) => x / 2)
        : euiTheme.size.xs;
    return parseInt(resolved, 10) * 2;
  }, [cellPadding, euiTheme]);

  const measure: EuiResizeObserverProps['onResize'] = useCallback(
    (dimensions) => {
      if (!dimensions) return;
      setShowText(dimensions.width < maxWidth - horizontalPaddingPx);
    },
    [maxWidth, horizontalPaddingPx]
  );

  const actionsText = i18n.translate('unifiedDataTable.controlColumnsActionHeader', {
    defaultMessage: 'Actions',
  });

  return (
    <ColumnHeaderTruncateContainer>
      <EuiScreenReaderOnly>
        <span>
          {i18n.translate('unifiedDataTable.actionsColumnHeader', {
            defaultMessage: 'Actions column',
          })}
        </span>
      </EuiScreenReaderOnly>
      {showText ? (
        <span data-test-subj="unifiedDataTable_actionsColumnHeaderText">{actionsText}</span>
      ) : (
        <EuiIconTip
          iconProps={{ 'data-test-subj': 'unifiedDataTable_actionsColumnHeaderIcon' }}
          type="info"
          content={actionsText}
        />
      )}
      <EuiResizeObserver onResize={measure}>
        {(resizeRef) => (
          <span
            ref={resizeRef}
            css={css`
              position: absolute;
              visibility: hidden;
              white-space: nowrap;
              pointer-events: none;
            `}
          >
            {actionsText}
          </span>
        )}
      </EuiResizeObserver>
    </ColumnHeaderTruncateContainer>
  );
};
