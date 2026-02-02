/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import {
  type EuiResizeObserverProps,
  EuiIconTip,
  EuiResizeObserver,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import ColumnHeaderTruncateContainer from '../../column_header_truncate_container';

export const ActionsHeader = ({ maxWidth }: { maxWidth: number }) => {
  const [showText, setShowText] = useState(false);

  const measure: EuiResizeObserverProps['onResize'] = useCallback(
    (dimensions) => {
      if (!dimensions) return;

      setShowText(dimensions.width < maxWidth);
    },
    [maxWidth]
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
