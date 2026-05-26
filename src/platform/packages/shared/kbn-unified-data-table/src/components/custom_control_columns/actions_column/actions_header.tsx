/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  type EuiResizeObserverProps,
  EuiIconTip,
  EuiResizeObserver,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import ColumnHeaderTruncateContainer from '../../column_header_truncate_container';

export interface ActionsHeaderProps {
  maxWidth: number;
}

const HEADER_CELL_SELECTOR = '.unifiedDataTable__headerCell';

const getHorizontalPadding = (node: HTMLElement | null): number => {
  const cell = node?.closest<HTMLElement>(HEADER_CELL_SELECTOR);
  if (!cell) return 0;
  const style = window.getComputedStyle(cell);
  const left = parseFloat(style.paddingLeft) || 0;
  const right = parseFloat(style.paddingRight) || 0;
  return left + right;
};

interface ActionsHeaderGhostTextProps {
  actionsText: string;
  ghostRef: React.MutableRefObject<HTMLSpanElement | null>;
  resizeRef: (el: HTMLElement | null) => void;
}

const ActionsHeaderGhostText = ({
  actionsText,
  ghostRef,
  resizeRef,
}: ActionsHeaderGhostTextProps) => {
  const setRefs = useCallback(
    (element: HTMLSpanElement | null) => {
      ghostRef.current = element;
      resizeRef(element);
    },
    [ghostRef, resizeRef]
  );

  return (
    <span
      ref={setRefs}
      css={css`
        position: absolute;
        visibility: hidden;
        white-space: nowrap;
        pointer-events: none;
      `}
    >
      {actionsText}
    </span>
  );
};

export const ActionsHeader = ({ maxWidth }: ActionsHeaderProps) => {
  const [showText, setShowText] = useState(false);
  const ghostRef = useRef<HTMLSpanElement | null>(null);

  const measure: EuiResizeObserverProps['onResize'] = useCallback(
    (dimensions) => {
      if (!dimensions) return;
      const horizontalPadding = getHorizontalPadding(ghostRef.current);
      setShowText(dimensions.width < maxWidth - horizontalPadding);
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
          <ActionsHeaderGhostText
            actionsText={actionsText}
            ghostRef={ghostRef}
            resizeRef={resizeRef}
          />
        )}
      </EuiResizeObserver>
    </ColumnHeaderTruncateContainer>
  );
};
