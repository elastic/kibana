/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

interface DragHandleProps {
  isEditable: boolean;
  controlTitle?: string;
  [key: string]: any; // Allows passing additional props (like drag info)
}

const dragHandleStyles = css({
  cursor: 'grab',
  lineHeight: '0', // Vertically center the grab handle
});

export const DragHandle = ({ isEditable, controlTitle = '', ...rest }: DragHandleProps) => {
  if (!isEditable) return null;

  return (
    <button
      {...rest}
      aria-label={i18n.translate('controls.controlGroup.ariaActions.moveControlButtonAction', {
        defaultMessage: 'Move control {controlTitle}',
        values: { controlTitle },
      })}
      css={dragHandleStyles}
    >
      <EuiIcon type="grabHorizontal" />
    </button>
  );
};
