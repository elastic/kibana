/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import { isFontInspectShortcut } from '../lib/keyboard_shortcuts';
import { useShortcutToggle } from '../hooks/use_shortcut_toggle';
import { ToolToggleButton } from './tool_toggle_button';

const LazyFontInspectOverlay = lazy(() =>
  import('./font_inspect/font_inspect_overlay').then(({ FontInspectOverlay }) => ({
    default: FontInspectOverlay,
  }))
);

/**
 * Toggles font inspect mode from the developer toolbar.
 *
 * @returns A toolbar button that activates the font inspect overlay.
 */
export const FontInspectButton = () => {
  const {
    isActive: isInspectingFont,
    setIsActive: setIsInspectingFont,
    handleKeydown,
  } = useShortcutToggle(isFontInspectShortcut);

  return (
    <>
      <ToolToggleButton
        isActive={isInspectingFont}
        onToggle={() => setIsInspectingFont((prev) => !prev)}
        handleKeydown={handleKeydown}
        iconType="text"
        inactiveTooltip={i18n.translate('kbnDesignTools.fontInspect.button.tooltip', {
          values: { keyboardShortcut: isMac ? '⌘ ,' : 'Ctrl ,' },
          defaultMessage: 'Inspect font {keyboardShortcut}',
        })}
        ariaLabel={i18n.translate('kbnDesignTools.fontInspect.button.ariaLabel', {
          defaultMessage: 'Inspect font',
        })}
        testSubj="fontInspectButton"
      />
      {isInspectingFont && (
        <Suspense fallback={null}>
          <LazyFontInspectOverlay setIsInspectingFont={setIsInspectingFont} />
        </Suspense>
      )}
    </>
  );
};
