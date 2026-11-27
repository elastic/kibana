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
import { isMac } from '../../lib/platform';
import { isMeasureShortcut } from '../lib/keyboard_shortcuts';
import { useShortcutToggle } from '../hooks/use_shortcut_toggle';
import { ToolToggleButton } from './tool_toggle_button';
// Static import: the published package is a single bundle, so lazy chunks would not resolve.
import { MeasureOverlay } from './measure/measure_overlay';

const NO_IGNORED_CLASS_PREFIXES: readonly string[] = [];

/** Props for the `MeasureButton` component. */
export interface MeasureButtonProps {
  /**
   * Class name prefixes of host chrome elements (e.g. `kbnChromeLayout`) that the
   * measure overlay should never select. Defaults to none.
   */
  ignoredClassPrefixes?: readonly string[];
}

/**
 * Toggles measure mode from the developer toolbar.
 *
 * @returns A toolbar button that activates the measure overlay.
 */
export const MeasureButton = ({
  ignoredClassPrefixes = NO_IGNORED_CLASS_PREFIXES,
}: MeasureButtonProps) => {
  const {
    isActive: isMeasuring,
    setIsActive: setIsMeasuring,
    handleKeydown,
  } = useShortcutToggle(isMeasureShortcut);

  return (
    <>
      <ToolToggleButton
        isActive={isMeasuring}
        onToggle={() => setIsMeasuring((prev) => !prev)}
        handleKeydown={handleKeydown}
        iconType="alignCenterHorizontal"
        inactiveTooltip={i18n.translate('kbnUI.developerToolbar.measure.button.tooltip', {
          values: { keyboardShortcut: isMac ? '⌘ .' : 'Ctrl .' },
          defaultMessage: 'Measure spacing {keyboardShortcut}',
        })}
        ariaLabel={i18n.translate('kbnUI.developerToolbar.measure.button.ariaLabel', {
          defaultMessage: 'Measure spacing',
        })}
        testSubj="measureSpacingButton"
      />
      {isMeasuring && (
        <MeasureOverlay
          setIsMeasuring={setIsMeasuring}
          ignoredClassPrefixes={ignoredClassPrefixes}
        />
      )}
    </>
  );
};
