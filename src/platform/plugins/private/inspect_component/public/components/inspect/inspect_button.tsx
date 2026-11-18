/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import type { MouseEvent } from 'react';
import type { CoreStart, OverlayRef } from '@kbn/core/public';
import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiHeaderSectionItemButton,
  EuiToolTip,
  EuiWindowEvent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import {
  isGrabKeyboardShortcut,
  isKeyboardShortcut,
} from '../../lib/keyboard_shortcut/keyboard_shortcut';
import {
  activeMode$,
  deactivateMode,
  toggleActiveMode,
  useActiveMode,
} from '../../lib/active_mode';
import type { InspectMode } from '../../lib/types';
import { InspectOverlay } from './overlay/inspect_overlay';

const ARIA_LABEL = i18n.translate('kbnInspectComponent.inspectButton.ariaLabel', {
  defaultMessage: 'Inspect component',
});

const TOOLTIP_CONTENT = i18n.translate('kbnInspectComponent.inspectButton.tooltip', {
  values: { keyboardShortcut: isMac ? "⌘ '" : "Ctrl '" },
  defaultMessage: 'Inspect component {keyboardShortcut}',
});

const GRAB_ARIA_LABEL = i18n.translate('kbnInspectComponent.grabButton.ariaLabel', {
  defaultMessage: 'Grab component',
});

const GRAB_TOOLTIP_CONTENT = i18n.translate('kbnInspectComponent.grabButton.tooltip', {
  values: { keyboardShortcut: isMac ? "⌘ ⇧ '" : "Ctrl Shift '" },
  defaultMessage: 'Grab component {keyboardShortcut}',
});

interface ModeConfig {
  ariaLabel: string;
  tooltipContent: string;
  iconType: IconType;
  testSubj: string;
  isShortcut: (event: KeyboardEvent) => boolean;
}

const MODE_CONFIG: Record<InspectMode, ModeConfig> = {
  inspect: {
    ariaLabel: ARIA_LABEL,
    tooltipContent: TOOLTIP_CONTENT,
    iconType: 'inspect',
    testSubj: 'inspectComponentButton',
    isShortcut: isKeyboardShortcut,
  },
  grab: {
    ariaLabel: GRAB_ARIA_LABEL,
    tooltipContent: GRAB_TOOLTIP_CONTENT,
    iconType: 'move',
    testSubj: 'grabComponentButton',
    isShortcut: isGrabKeyboardShortcut,
  },
};

interface Props {
  core: CoreStart;
  branch: string;
  buttonLocation?: 'header' | 'developerToolbar';
  mode?: InspectMode;
}

/**
 * The entry point for the plugin. Toggles inspect or grab mode, only one of them can be active.
 */
export const InspectButton = ({
  core,
  branch,
  buttonLocation = 'header',
  mode = 'inspect',
}: Props) => {
  const isInspecting = useActiveMode() === mode;
  const [flyoutOverlayRef, setFlyoutOverlayRef] = useState<OverlayRef | null>(null);
  const { ariaLabel, tooltipContent, iconType, testSubj, isShortcut } = MODE_CONFIG[mode];

  /** An inspect click finishing after the user switched modes must not turn the new mode off. */
  const setIsInspecting = useCallback(
    (value: boolean) => (value ? activeMode$.next(mode) : deactivateMode(mode)),
    [mode]
  );

  const buttonStyle = css`
    & > .euiButtonEmpty__content > svg {
      margin-left: 6px;
    }
  `;

  const handleKeydown = (event: KeyboardEvent) => {
    if (isShortcut(event)) {
      event.preventDefault();
      toggleActiveMode(mode);
    }
  };

  const handleTogglingInspectMode = () => {
    if (flyoutOverlayRef) {
      flyoutOverlayRef.close();
      setFlyoutOverlayRef(null);
    }
    toggleActiveMode(mode);
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
      <EuiToolTip content={isInspecting ? '' : tooltipContent} position="bottom">
        <ButtonComponent
          onClick={handleTogglingInspectMode}
          onMouseDown={preventTargetFromLosingFocus}
          iconType={iconType}
          isSelected={isInspecting}
          aria-pressed={isInspecting}
          css={buttonStyle}
          aria-label={ariaLabel}
          data-test-subj={testSubj}
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
          mode={mode}
          setFlyoutOverlayRef={setFlyoutOverlayRef}
          setIsInspecting={setIsInspecting}
        />
      )}
    </>
  );
};
