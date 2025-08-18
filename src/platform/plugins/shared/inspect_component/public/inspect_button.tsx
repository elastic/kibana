/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import { EuiHeaderSectionItemButton, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { CoreStart, OverlayRef } from '@kbn/core/public';
import {
  createHighlightRectangle,
  createInspectHighlight,
  createInspectOverlay,
  getInspectedElementData,
  isMac,
  isKeyboardShortcut,
} from './utils';

const TOOLTIP_CONTENT = i18n.translate('kbnInspectComponent.inspectButton.tooltip', {
  values: { keyboardShortcut: isMac ? "⌘ '" : "Ctrl '" },
  defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
});

const ARIA_LABEL = i18n.translate('kbnInspectComponent.inspectButton.ariaLabel', {
  defaultMessage: 'Inspect component',
});

interface Props {
  core: CoreStart;
}

export const InspectButton = ({ core }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [isInspecting, setIsInspecting] = useState(false);
  const [flyoutRef, setFlyoutRef] = useState<OverlayRef | undefined>(undefined);

  const buttonStyle = css`
    background-color: ${isInspecting ? '#0a233c' : 'transparent'};
    & > .euiButtonEmpty__content > svg {
      margin-left: 6px;
    }
  `;

  /*
    To inspect a component that is disabled, "pointerdown" event has to be used. This does not allow for intercepting the click event
    on the element, so an overlay is needed, which captures the pointerdown event and then finds the element at the pointer position.
    The overlay is removed after the click event is handled.
  */
  useEffect(() => {
    if (!isInspecting) return;

    const overlay = createInspectOverlay(euiTheme);
    const highlight = createInspectHighlight({ overlay, euiTheme });

    const handleClick = async (event: PointerEvent) => {
      await getInspectedElementData({
        event,
        overlay,
        core,
        setFlyoutRef,
        setIsInspecting,
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      createHighlightRectangle({
        event,
        overlay,
        highlight,
      });
    };

    overlay.addEventListener('pointerdown', handleClick);
    document.addEventListener('pointermove', handlePointerMove);
    document.body.appendChild(overlay);

    return () => {
      overlay.removeEventListener('pointerdown', handleClick);
      document.removeEventListener('pointermove', handlePointerMove);
      document.body.removeChild(overlay);
    };
  }, [isInspecting, flyoutRef, euiTheme, core]);

  useEffect(() => {
    const keyboardListener = (event: KeyboardEvent) => {
      if (isKeyboardShortcut(event)) {
        event.preventDefault();
        setIsInspecting((prev) => !prev);
      }
    };

    window.addEventListener('keydown', keyboardListener);
    return () => {
      window.removeEventListener('keydown', keyboardListener);
    };
  }, []);

  const handleInspectClick = () => {
    if (flyoutRef) {
      flyoutRef.close();
      setFlyoutRef(undefined);
    }
    setIsInspecting(true);
  };

  return (
    <EuiToolTip content={isInspecting ? '' : TOOLTIP_CONTENT} position="bottom">
      <EuiHeaderSectionItemButton
        onClick={handleInspectClick}
        iconType="inspect"
        isSelected={isInspecting}
        aria-pressed={isInspecting}
        css={buttonStyle}
        aria-label={ARIA_LABEL}
        data-test-subj="inspectComponentButton"
      />
    </EuiToolTip>
  );
};
