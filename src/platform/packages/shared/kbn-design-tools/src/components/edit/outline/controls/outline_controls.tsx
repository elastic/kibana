/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';
import { DEVTOOL_IGNORE_ATTR } from '../../../../lib/constants';
import { DeleteButton } from './delete_button';
import { DuplicateButton } from './duplicate_button';

interface Props {
  onDelete: () => void;
  onDuplicate: () => void;
}

export const OutlineControls = ({ onDelete, onDuplicate }: Props) => {
  const { euiTheme } = useEuiTheme();

  const panelCss = useMemo(
    () =>
      css({
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translate(-50%, calc(100% + 6px))',
        display: 'flex',
        gap: '4px',
        padding: '4px',
        background: euiTheme.colors.backgroundBasePlain,
        borderRadius: euiTheme.border.radius.small,
        boxShadow: euiTheme.shadows.s.down,
        pointerEvents: 'auto',
        zIndex: 1,
      }),
    [euiTheme]
  );

  return (
    <div className={panelCss} {...{ [DEVTOOL_IGNORE_ATTR]: '' }}>
      <DuplicateButton onClick={onDuplicate} />
      <DeleteButton onClick={onDelete} />
    </div>
  );
};
