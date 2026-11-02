/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy, useState } from 'react';
import type { MouseEvent } from 'react';
import { EuiButtonIcon, EuiToolTip, EuiWindowEvent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import { isFontInspectShortcut } from '../lib/keyboard_shortcuts';

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
  const [isInspectingFont, setIsInspectingFont] = useState(false);

  const handleKeydown = (event: KeyboardEvent) => {
    if (isFontInspectShortcut(event)) {
      event.preventDefault();
      setIsInspectingFont((prev) => !prev);
    }
  };

  const preventTargetFromLosingFocus = (event: MouseEvent) => {
    event.preventDefault();
  };

  return (
    <>
      <EuiWindowEvent event="keydown" handler={handleKeydown} />
      <EuiToolTip
        content={
          isInspectingFont
            ? ''
            : i18n.translate('kbnDesignTools.fontInspect.button.tooltip', {
                values: { keyboardShortcut: isMac ? '⌘ ,' : 'Ctrl ,' },
                defaultMessage: 'Inspect font {keyboardShortcut}',
              })
        }
      >
        <EuiButtonIcon
          onClick={() => setIsInspectingFont((prev) => !prev)}
          onMouseDown={preventTargetFromLosingFocus}
          iconType="text"
          isSelected={isInspectingFont}
          aria-pressed={isInspectingFont}
          aria-label={i18n.translate('kbnDesignTools.fontInspect.button.ariaLabel', {
            defaultMessage: 'Inspect font',
          })}
          color="text"
          data-test-subj="fontInspectButton"
        />
      </EuiToolTip>
      {isInspectingFont && (
        <Suspense fallback={null}>
          <LazyFontInspectOverlay setIsInspectingFont={setIsInspectingFont} />
        </Suspense>
      )}
    </>
  );
};
