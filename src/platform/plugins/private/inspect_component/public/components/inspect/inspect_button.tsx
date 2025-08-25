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
import { EuiHeaderSectionItemButton, EuiToolTip, EuiWindowEvent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isKeyboardShortcut, isMac } from '../../lib/keyboard_shortcut/keyboard_shortcut';
import { InspectOverlay } from './overlay/inspect_overlay';

const ARIA_LABEL = i18n.translate('kbnInspectComponent.inspectButton.ariaLabel', {
  defaultMessage: 'Inspect component',
});

const TOOLTIP_CONTENT = i18n.translate('kbnInspectComponent.inspectButton.tooltip', {
  values: { keyboardShortcut: isMac() ? "⌘ '" : "Ctrl '" },
  defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
});

interface Props {
  core: CoreStart;
}

/**
 * The entry point for the plugin.
 * Renders the inspect button which toggles the inspect mode.
 */
export const InspectButton = ({ core }: Props) => {
  const [isInspecting, setIsInspecting] = useState(false);
  const [flyoutOverlayRef, setFlyoutOverlayRef] = useState<OverlayRef>();

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

  const handleTogglingInspectModeClick = () => {
    if (flyoutOverlayRef) {
      flyoutOverlayRef.close();
      setFlyoutOverlayRef(undefined);
    }
    setIsInspecting((prev) => !prev);
  };

  /**
   * This is needed to prevent components like EmbeddableConsole from closing
   * when toggling on inspect mode by clicking on the InspectButton.
   */
  const preventTargetFromLosingFocus = (event: MouseEvent) => {
    event.preventDefault();
  };

  return (
    <>
      <EuiWindowEvent event="keydown" handler={handleKeydown} />
      <EuiToolTip content={isInspecting ? '' : TOOLTIP_CONTENT} position="bottom">
        <EuiHeaderSectionItemButton
          onClick={handleTogglingInspectModeClick}
          onMouseDown={preventTargetFromLosingFocus}
          iconType="inspect"
          isSelected={isInspecting}
          aria-pressed={isInspecting}
          css={buttonStyle}
          aria-label={ARIA_LABEL}
          data-test-subj="inspectComponentButton"
        />
      </EuiToolTip>
      {isInspecting && (
        <InspectOverlay
          core={core}
          setFlyoutOverlayRef={setFlyoutOverlayRef}
          setIsInspecting={setIsInspecting}
        />
      )}
    </>
  );
};
