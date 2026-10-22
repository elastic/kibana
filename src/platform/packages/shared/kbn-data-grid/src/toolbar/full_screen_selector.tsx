/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ToolbarIconButton } from './toolbar_control_button';

interface FullScreenSelectorProps {
  isFullScreen: boolean;
  onToggle: () => void;
}

export const FullScreenSelector = ({ isFullScreen, onToggle }: FullScreenSelectorProps) => (
  <ToolbarIconButton
    iconType={isFullScreen ? 'fullScreenExit' : 'fullScreen'}
    aria-label={
      isFullScreen
        ? i18n.translate('kbnDataGrid.toolbar.exitFullScreen', {
            defaultMessage: 'Exit fullscreen',
          })
        : i18n.translate('kbnDataGrid.toolbar.enterFullScreen', {
            defaultMessage: 'Enter fullscreen',
          })
    }
    aria-pressed={isFullScreen}
    data-test-subj="dataGridFullScreenButton"
    onClick={onToggle}
  />
);
