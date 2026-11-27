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
import type { IconType } from '@elastic/eui';
import { EuiButtonIcon, EuiToolTip, EuiWindowEvent, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isMac } from '../../../lib/platform';
import { useHostColorMode } from '../../../toolbar/components/host_color_mode';
import {
  isGrabKeyboardShortcut,
  isKeyboardShortcut,
} from '../../lib/keyboard_shortcut/keyboard_shortcut';
import {
  deactivateMode,
  setActiveMode,
  toggleActiveMode,
  useActiveMode,
} from '../../lib/active_mode';
import type { ComponentData } from '../../lib/get_inspected_element_data';
import type { InspectMode } from '../../lib/types';
import type { InspectButtonProps } from '../../types';
// Static imports: the published package is a single bundle, so lazy chunks would not resolve.
import { InspectOverlay } from './overlay/inspect_overlay';
import { InspectFlyout } from './flyout/inspect_flyout';

const ARIA_LABEL = i18n.translate('kbnUI.developerToolbar.inspect.inspectButton.ariaLabel', {
  defaultMessage: 'Inspect component',
});

const TOOLTIP_CONTENT = i18n.translate('kbnUI.developerToolbar.inspect.inspectButton.tooltip', {
  values: { keyboardShortcut: isMac ? "⌘ '" : "Ctrl '" },
  defaultMessage: 'Inspect component {keyboardShortcut}',
});

const MISSING_DEBUG_SOURCE_TOOLTIP_CONTENT = i18n.translate(
  'kbnUI.developerToolbar.inspect.inspectButton.missingDebugSourceTooltip',
  {
    values: { keyboardShortcut: isMac ? "⌘ '" : "Ctrl '" },
    defaultMessage:
      'Inspect component {keyboardShortcut}. Some elements have no source location: inspect needs a development build that compiles JSX with "@babel/preset-react" and "development: true".',
  }
);

const GRAB_ARIA_LABEL = i18n.translate('kbnUI.developerToolbar.inspect.grab.buttonAriaLabel', {
  defaultMessage: 'Grab component',
});

const GRAB_TOOLTIP_CONTENT = i18n.translate('kbnUI.developerToolbar.inspect.grab.buttonTooltip', {
  values: { keyboardShortcut: isMac ? "⌘ ⇧ '" : "Ctrl Shift '" },
  defaultMessage: 'Grab component {keyboardShortcut}',
});

const GRAB_MISSING_DEBUG_SOURCE_TOOLTIP_CONTENT = i18n.translate(
  'kbnUI.developerToolbar.inspect.grab.missingDebugSourceTooltip',
  {
    values: { keyboardShortcut: isMac ? "⌘ ⇧ '" : "Ctrl Shift '" },
    defaultMessage:
      'Grab component {keyboardShortcut}. Some elements have no source location: grab needs a development build that compiles JSX with "@babel/preset-react" and "development: true".',
  }
);

const NO_IGNORED_CLASS_PREFIXES: readonly string[] = [];

interface ModeConfig {
  ariaLabel: string;
  tooltipContent: string;
  missingDebugSourceTooltipContent: string;
  iconType: IconType;
  testSubj: string;
  isShortcut: (event: KeyboardEvent) => boolean;
}

const MODE_CONFIG: Record<InspectMode, ModeConfig> = {
  inspect: {
    ariaLabel: ARIA_LABEL,
    tooltipContent: TOOLTIP_CONTENT,
    missingDebugSourceTooltipContent: MISSING_DEBUG_SOURCE_TOOLTIP_CONTENT,
    iconType: 'inspect',
    testSubj: 'inspectComponentButton',
    isShortcut: isKeyboardShortcut,
  },
  grab: {
    ariaLabel: GRAB_ARIA_LABEL,
    tooltipContent: GRAB_TOOLTIP_CONTENT,
    missingDebugSourceTooltipContent: GRAB_MISSING_DEBUG_SOURCE_TOOLTIP_CONTENT,
    iconType: 'move',
    testSubj: 'grabComponentButton',
    isShortcut: isGrabKeyboardShortcut,
  },
};

interface InspectedComponent {
  componentData: ComponentData;
  target: HTMLElement;
}

/**
 * Toggles inspect or grab mode from the developer toolbar, only one of them can be active.
 * In inspect mode clicking an element opens a flyout with its React source component, file
 * location and host-provided links; in grab mode its context is copied or dragged out.
 */
export const InspectButton = ({
  host,
  mode = 'inspect',
  ignoredClassPrefixes = NO_IGNORED_CLASS_PREFIXES,
}: InspectButtonProps) => {
  const isInspecting = useActiveMode() === mode;
  const [inspected, setInspected] = useState<InspectedComponent | null>(null);
  const [isDebugSourceMissing, setIsDebugSourceMissing] = useState(false);
  const {
    ariaLabel,
    tooltipContent,
    missingDebugSourceTooltipContent,
    iconType,
    testSubj,
    isShortcut,
  } = MODE_CONFIG[mode];
  const hostColorMode = useHostColorMode();
  const { colorMode: euiColorMode } = useEuiTheme();

  // Inside the toolbar `useEuiTheme` reports the toolbar's own dark theme, not the page's.
  const colorMode = host.colorMode ?? hostColorMode ?? (euiColorMode === 'DARK' ? 'dark' : 'light');

  /** An inspect click finishing after the user switched modes must not turn the new mode off. */
  const setIsInspecting = useCallback(
    (value: boolean) => (value ? setActiveMode(mode) : deactivateMode(mode)),
    [mode]
  );

  const handleTogglingInspectMode = () => {
    setInspected(null);
    toggleActiveMode(mode);
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (isShortcut(event)) {
      event.preventDefault();
      handleTogglingInspectMode();
    }
  };

  const handleInspect = useCallback((componentData: ComponentData, target: HTMLElement) => {
    setInspected({ componentData, target });
  }, []);

  const handleMissingDebugSource = useCallback(() => setIsDebugSourceMissing(true), []);

  const handleCloseFlyout = useCallback(() => setInspected(null), []);

  /**
   * Prevent components from losing focus when toggling on inspect mode via InspectButton.
   * If a component loses focus, it might unmount itself.
   */
  const preventTargetFromLosingFocus = (event: MouseEvent) => {
    event.preventDefault();
  };

  const idleTooltipContent = isDebugSourceMissing
    ? missingDebugSourceTooltipContent
    : tooltipContent;

  return (
    <>
      <EuiWindowEvent event="keydown" handler={handleKeydown} />
      <EuiToolTip content={isInspecting ? '' : idleTooltipContent}>
        <EuiButtonIcon
          onClick={handleTogglingInspectMode}
          onMouseDown={preventTargetFromLosingFocus}
          iconType={iconType}
          isSelected={isInspecting}
          aria-pressed={isInspecting}
          aria-label={ariaLabel}
          data-test-subj={testSubj}
          color="text"
        />
      </EuiToolTip>
      {isInspecting && (
        <InspectOverlay
          resolveFileData={host.resolveFileData}
          ignoredClassPrefixes={ignoredClassPrefixes}
          mode={mode}
          setIsInspecting={setIsInspecting}
          onInspect={handleInspect}
          onMissingDebugSource={handleMissingDebugSource}
        />
      )}
      {inspected && (
        <InspectFlyout
          componentData={inspected.componentData}
          target={inspected.target}
          host={host}
          colorMode={colorMode}
          onClose={handleCloseFlyout}
        />
      )}
    </>
  );
};
