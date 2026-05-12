/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css as emotionCss } from '@emotion/css';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DEVTOOL_IGNORE_ATTR } from '../../../../lib/constants';

interface Props {
  onDelete: () => void;
}

export const OutlineControls = ({ onDelete }: Props) => {
  const { euiTheme } = useEuiTheme();

  const panelCss = useMemo(
    () =>
      emotionCss({
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
      <EuiButtonIcon
        iconType="trash"
        color="danger"
        size="xs"
        aria-label={i18n.translate('kbnDesignTools.editOutline.deleteElement', {
          defaultMessage: 'Delete element',
        })}
        onClick={onDelete}
        data-test-subj="editOutlineDeleteButton"
      />
    </div>
  );
};
