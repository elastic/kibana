/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, OverlayRef } from '@kbn/core/public';
import React, { useState } from 'react';
import type { MouseEvent } from 'react';
import { css } from '@emotion/react';
import { EuiHeaderSectionItemButton, EuiToolTip, EuiWindowEvent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InspectOverlay } from './overlay/inspect_overlay';
import { isKeyboardShortcut, isMac } from '../utils';

const ARIA_LABEL = i18n.translate('kbnInspectComponent.inspectButton.ariaLabel', {
  defaultMessage: 'Inspect component',
});

const TOOLTIP_CONTENT = i18n.translate('kbnInspectComponent.inspectButton.tooltip', {
  values: { keyboardShortcut: isMac ? "⌘ '" : "Ctrl '" },
  defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
});

interface Props {
  core: CoreStart;
}

export const InspectButton = ({ core }: Props) => {
  const [isInspecting, setIsInspecting] = useState(false);
  const [flyoutRef, setFlyoutRef] = useState<OverlayRef | undefined>(undefined);

  const buttonStyle = css`
    background-color: ${isInspecting ? '#0a233c' : 'transparent'};
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

  const handleInspectClick = () => {
    if (flyoutRef) {
      flyoutRef.close();
      setFlyoutRef(undefined);
    }
    setIsInspecting((prev) => !prev);
  };

  // Prevents components from closing when clicking on the button
  const preventTargetLosingFocus = (event: MouseEvent) => {
    event.preventDefault();
  };

  return (
    <>
      <EuiWindowEvent event="keydown" handler={handleKeydown} />
      <EuiToolTip content={isInspecting ? '' : TOOLTIP_CONTENT} position="bottom">
        <EuiHeaderSectionItemButton
          onClick={handleInspectClick}
          onMouseDown={preventTargetLosingFocus}
          iconType="inspect"
          isSelected={isInspecting}
          aria-pressed={isInspecting}
          css={buttonStyle}
          aria-label={ARIA_LABEL}
          data-test-subj="inspectComponentButton"
        />
      </EuiToolTip>
      {isInspecting && (
        <InspectOverlay core={core} setFlyoutRef={setFlyoutRef} setIsInspecting={setIsInspecting} />
      )}
    </>
  );
};
