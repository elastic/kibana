/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { EuiButtonIcon, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PocToastPlacement } from './poc_toast_types';
import { pocToastControlsStyles } from './poc_toast_styles';

const addLabel = i18n.translate('pocStackedToast.addRandomToast', {
  defaultMessage: 'Add random toast',
});

const placementLabels: Record<PocToastPlacement, string> = {
  'top-center': i18n.translate('pocStackedToast.placementTopCenter', {
    defaultMessage: 'Toasts at top center. Switch to top right',
  }),
  'top-right': i18n.translate('pocStackedToast.placementTopRight', {
    defaultMessage: 'Toasts at top right. Switch to top center',
  }),
};

export interface PocToastControlsProps {
  placement: PocToastPlacement;
  onAdd: () => void;
  onPlacementChange: (placement: PocToastPlacement) => void;
}

/** Floating dev panel to add toasts and switch placement, kept clear of both toast placements. */
export const PocToastControls = ({
  placement,
  onAdd,
  onPlacementChange,
}: PocToastControlsProps) => {
  const euiThemeContext = useEuiTheme();
  const controlsStyles = useMemo(() => pocToastControlsStyles(euiThemeContext), [euiThemeContext]);

  return createPortal(
    <div css={controlsStyles} data-test-subj="pocToastControls">
      <EuiText size="xs" color="ghost">
        <strong>Toast POC</strong>
      </EuiText>
      <EuiToolTip content={placementLabels[placement]} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType={placement === 'top-center' ? 'alignTop' : 'alignTopRight'}
          color="accent"
          display="fill"
          aria-label={placementLabels[placement]}
          onClick={() => onPlacementChange(placement === 'top-center' ? 'top-right' : 'top-center')}
          data-test-subj="pocToastPlacementToggle"
        />
      </EuiToolTip>
      <EuiToolTip content={addLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="bell"
          color="accent"
          display="fill"
          aria-label={addLabel}
          onClick={onAdd}
          data-test-subj="pocToastStackTrigger"
        />
      </EuiToolTip>
    </div>,
    document.body
  );
};
