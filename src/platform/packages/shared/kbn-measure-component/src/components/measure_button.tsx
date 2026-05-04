/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { MouseEvent } from 'react';
import { EuiButtonIcon, EuiToolTip, EuiWindowEvent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import { MeasureOverlay } from './measure_overlay';
import { isMeasureShortcut } from '../lib';

const buttonAriaLabel = () =>
  i18n.translate('kbnMeasureComponent.measureButton.ariaLabel', {
    defaultMessage: 'Measure spacing',
  });

const tooltipContent = () =>
  i18n.translate('kbnMeasureComponent.measureButton.tooltip', {
    values: { keyboardShortcut: isMac ? '⌘ .' : 'Ctrl .' },
    defaultMessage: 'Measure spacing {keyboardShortcut}',
  });

/**
 * The entry point for the measure component.
 * Toggles measure mode from the developer toolbar.
 */
export const MeasureButton = () => {
  const [isMeasuring, setIsMeasuring] = useState(false);

  const handleKeydown = (event: KeyboardEvent) => {
    if (isMeasureShortcut(event)) {
      event.preventDefault();
      setIsMeasuring((prev) => !prev);
    }
  };

  const handleToggleMeasureMode = () => {
    setIsMeasuring((prev) => !prev);
  };

  const preventTargetFromLosingFocus = (event: MouseEvent) => {
    event.preventDefault();
  };

  return (
    <>
      <EuiWindowEvent event="keydown" handler={handleKeydown} />
      <EuiToolTip content={isMeasuring ? '' : tooltipContent()} position="bottom">
        <EuiButtonIcon
          onClick={handleToggleMeasureMode}
          onMouseDown={preventTargetFromLosingFocus}
          iconType="editorItemAlignCenter"
          isSelected={isMeasuring}
          aria-pressed={isMeasuring}
          aria-label={buttonAriaLabel()}
          color="text"
          data-test-subj="measureSpacingButton"
        />
      </EuiToolTip>
      {isMeasuring && <MeasureOverlay setIsMeasuring={setIsMeasuring} />}
    </>
  );
};
