/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, type UseEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

/**
 * Shares the drag handle element with the parent `ControlPanel` so that Pragmatic
 * drag-and-drop can bind dragging to the handle (rather than the whole panel).
 * The value is `null` when dragging is disabled (e.g. not in edit mode).
 */
export const DragHandleContext = createContext<React.RefObject<HTMLDivElement> | null>(null);

interface DragHandleProps {
  isEditable: boolean;
  controlTitle?: string;
  highContrast?: boolean; // If true, set the icon color to higher contrast instead of subdued
  children?: React.ReactNode;
  className?: string;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

const dragHandleStyles = {
  dragHandle: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      blockSize: '100%',
      cursor: 'grab',
      lineHeight: '0', // Vertically center the grab handle
      '.euiIcon': {
        color: euiTheme.colors.textDisabled,
      },
      '&:hover > .euiIcon:first-of-type': {
        color: euiTheme.colors.textParagraph,
      },
      '.euiFormLabel': {
        pointerEvents: 'none', // Prevent label from blocking drag events
      },
    }),
  dragHandleHighContrast: ({ euiTheme }: UseEuiTheme) =>
    css({
      '.euiIcon': {
        color: euiTheme.colors.textParagraph,
      },
    }),
};

export const DragHandle = ({
  isEditable,
  controlTitle = '',
  children,
  highContrast,
  className,
  onKeyDown,
}: DragHandleProps) => {
  const styles = useMemoCss(dragHandleStyles);
  const dragHandleRef = useContext(DragHandleContext);

  if (!isEditable) return <>{children}</>;

  return (
    <div
      ref={dragHandleRef ?? undefined}
      className={className}
      role="button"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={i18n.translate('controls.controlGroup.ariaActions.moveControlButtonAction', {
        defaultMessage: 'Move control {controlTitle}',
        values: { controlTitle },
      })}
      css={[styles.dragHandle, highContrast ? styles.dragHandleHighContrast : null]}
    >
      <EuiIcon type="dragHorizontal" aria-hidden={true} />
      {children}
    </div>
  );
};
