/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, type UseEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

interface DragHandleProps {
  isEditable: boolean;
  controlTitle?: string;
  dragHandleRef?: React.Ref<HTMLDivElement>;
  highContrast?: boolean; // If true, set the icon color to higher contrast instead of subdued
  [key: string]: any; // Allows passing additional props (like drag info)
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
        color: euiTheme.colors.vis.euiColorVis0,
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
      '&:hover > .euiIcon:first-of-type': {
        color: euiTheme.colors.primary,
      },
    }),
};

export const DragHandle = ({
  isEditable,
  controlTitle = '',
  children,
  highContrast,
  dragHandleRef,
  ...rest
}: DragHandleProps) => {
  const styles = useMemoCss(dragHandleStyles);

  if (!isEditable) return children;

  return (
    <div
      {...rest}
      ref={dragHandleRef}
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
