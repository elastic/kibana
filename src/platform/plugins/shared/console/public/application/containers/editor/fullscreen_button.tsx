/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { MAIN_PANEL_LABELS } from '../main/i18n';

interface Props {
  isFullscreenOpen: boolean;
  onToggle: () => void;
}

export const FullscreenButton = ({ isFullscreenOpen, onToggle }: Props) => {
  const tooltipContent = isFullscreenOpen
    ? MAIN_PANEL_LABELS.closeFullscrenButton
    : MAIN_PANEL_LABELS.openFullscrenButton;

  return (
    <EuiToolTip position="top" disableScreenReaderOutput={true} content={tooltipContent}>
      <EuiButtonIcon
        iconType={isFullscreenOpen ? 'fullScreenExit' : 'fullScreen'}
        onClick={onToggle}
        aria-label={tooltipContent}
        data-test-subj="consoleToggleFullscreenButton"
      />
    </EuiToolTip>
  );
};
