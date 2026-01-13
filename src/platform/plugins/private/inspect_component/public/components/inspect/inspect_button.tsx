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
import type { CoreStart, OverlayRef } from '@kbn/core/public';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiHeaderSectionItemButton,
  EuiToolTip,
  EuiWindowEvent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import { isKeyboardShortcut } from '../../lib/keyboard_shortcut/keyboard_shortcut';
import { InspectOverlay } from './overlay/inspect_overlay';

const ARIA_LABEL = i18n.translate('kbnInspectComponent.inspectButton.ariaLabel', {
  defaultMessage: 'Inspect component',
});

const TOOLTIP_CONTENT = i18n.translate('kbnInspectComponent.inspectButton.tooltip', {
  values: { keyboardShortcut: isMac ? "⌘ '" : "Ctrl '" },
  defaultMessage: 'Inspect component {keyboardShortcut}',
});

interface Props {
  core: CoreStart;
  branch: string;
  buttonLocation?: 'header' | 'developerToolbar';
}

/**
 * The entry point for the plugin. Toggles inspect mode.
 */
export const InspectButton = ({ core, branch, buttonLocation = 'header' }: Props) => {
  const [isInspecting, setIsInspecting] = useState(false);
  const [flyoutOverlayRef, setFlyoutOverlayRef] = useState<OverlayRef | null>(null);

  const buttonStyle = css`
    & > .euiButtonEmpty__content > svg {
      margin-left: 6px;
    }
  `;

  const handleKeydown = (event: KeyboardEvent) => {
    if (isKeyboardShortcut(event)) {
      event.preventDefault();
      setIsInspecting((prev) => !prev);
    }
  };

  const handleTogglingInspectMode = () => {
    if (flyoutOverlayRef) {
      flyoutOverlayRef.close();
      setFlyoutOverlayRef(null);
    }
    setIsInspecting((prev) => !prev);
  };

  /**
   * Prevent components from losing focus when toggling on inspect mode via InspectButton.
   * If a component loses focus, it might unmount itself.
   */
  const preventTargetFromLosingFocus = (event: MouseEvent) => {
    event.preventDefault();
  };

  const ButtonComponent = buttonLocation === 'header' ? EuiHeaderSectionItemButton : EuiButtonIcon;

  return (
    <>
      <EuiWindowEvent event="keydown" handler={handleKeydown} />
      <EuiToolTip content={isInspecting ? '' : TOOLTIP_CONTENT} position="bottom">
        <ButtonComponent
          onClick={handleTogglingInspectMode}
          onMouseDown={preventTargetFromLosingFocus}
          iconType="inspect"
          isSelected={isInspecting}
          aria-pressed={isInspecting}
          css={buttonStyle}
          aria-label={ARIA_LABEL}
          data-test-subj="inspectComponentButton"
          {...(buttonLocation === 'developerToolbar'
            ? {
                color: 'text',
              }
            : {})}
        />
      </EuiToolTip>
      {isInspecting && (
        <InspectOverlay
          core={core}
          branch={branch}
          setFlyoutOverlayRef={setFlyoutOverlayRef}
          setIsInspecting={setIsInspecting}
        />
      )}
    </>
  );
};
