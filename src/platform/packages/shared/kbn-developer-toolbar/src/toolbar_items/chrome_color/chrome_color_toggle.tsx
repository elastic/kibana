/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiBadge, EuiButtonEmpty, EuiColorPicker, EuiPopover, EuiText } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import {
  CHROME_COLOR_PRESETS,
  isValidHexColor,
  resolveChromeColor,
  type ChromeColorSettings,
} from '@kbn/core-user-settings-common';

const COMMIT_DEBOUNCE_MS = 300;

/** The part of the core theme contract this item needs. */
interface ThemeContract {
  theme$: Observable<{ darkMode: boolean }>;
  getTheme: () => { darkMode: boolean };
}

interface Props {
  isDarkMode: boolean;
  /** The override stored for the current color mode, or an empty string. */
  overrideColor: string;
  /** The chrome background currently applied for the current color mode, if any. */
  appliedColor?: string;
  onChange: (color: string) => void;
}

const ChromeColorToggle = ({ isDarkMode, overrideColor, appliedColor, onChange }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  // Keeps the picker responsive while dragging; the committed value lags by the debounce.
  const [draft, setDraft] = useState<string | undefined>();
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pending = useRef<string | undefined>();

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (pending.current !== undefined) {
      onChange(pending.current);
      pending.current = undefined;
    }
    setDraft(undefined);
  }, [onChange]);

  // Persist any pending change when the item goes away.
  const latestOnChange = useRef(onChange);
  latestOnChange.current = onChange;
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current !== undefined) {
        latestOnChange.current(pending.current);
      }
    },
    []
  );

  const commit = (value: string) => {
    // Ignore partially typed values; an empty string clears the override.
    if (value && !isValidHexColor(value)) return;
    setDraft(value);
    pending.current = value;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, COMMIT_DEBOUNCE_MS);
  };

  const modeLabel = isDarkMode ? 'dark' : 'light';
  const shown = draft ?? overrideColor;

  const badge = (
    <EuiBadge
      color={appliedColor ?? 'hollow'}
      iconType="brush"
      iconSide="left"
      onClick={() => {
        if (isOpen) flush();
        setIsOpen(!isOpen);
      }}
      onClickAriaLabel={`Override chrome color for ${modeLabel} mode`}
      data-test-subj="developerToolbarChromeColor"
    >
      Chrome
    </EuiBadge>
  );

  return (
    <EuiPopover
      button={badge}
      aria-label="Chrome color override"
      isOpen={isOpen}
      closePopover={() => {
        flush();
        setIsOpen(false);
      }}
      anchorPosition="upCenter"
      panelPaddingSize="s"
    >
      <EuiText size="xs" css={{ marginBottom: 8 }}>
        <p>
          Overrides the chrome color for <strong>{modeLabel} mode</strong> only.
        </p>
      </EuiText>
      <EuiColorPicker
        display="inline"
        secondaryInputDisplay="top"
        color={shown}
        swatches={CHROME_COLOR_PRESETS}
        onChange={commit}
        aria-label={`Chrome color for ${modeLabel} mode`}
        data-test-subj="developerToolbarChromeColorPicker"
      />
      <EuiButtonEmpty
        size="xs"
        flush="left"
        isDisabled={!shown}
        onClick={() => commit('')}
        data-test-subj="developerToolbarChromeColorReset"
      >
        Reset {modeLabel} mode color
      </EuiButtonEmpty>
    </EuiPopover>
  );
};

type ProfileWithSettings = { userSettings?: ChromeColorSettings } | null;

/**
 * Toolbar item that overrides the chrome (header and side navigation) color for the color mode
 * that is currently active. It writes `chromeColorLight` or `chromeColorDark` to the user profile,
 * so the change is persisted and applied live, like the same setting in the profile page.
 */
export const LiveChromeColorToggle = ({
  theme,
  userProfile,
  onError,
}: {
  theme: ThemeContract;
  userProfile: UserProfileService;
  onError?: (error: Error) => void;
}) => {
  const { darkMode: isDarkMode } = useObservable(theme.theme$, theme.getTheme());
  const profile$ = useMemo(() => userProfile.getUserProfile$(), [userProfile]);
  const profile = useObservable(profile$, null) as ProfileWithSettings;
  const settings = profile?.userSettings;

  const key = isDarkMode ? 'chromeColorDark' : 'chromeColorLight';
  const overrideColor = settings?.[key] ?? '';
  const appliedColor = resolveChromeColor(settings, isDarkMode);

  const onChange = useCallback(
    (color: string) => {
      userProfile.partialUpdate({ userSettings: { [key]: color } }).catch((error) => {
        onError?.(error);
      });
    },
    [userProfile, key, onError]
  );

  return (
    <ChromeColorToggle
      isDarkMode={isDarkMode}
      overrideColor={overrideColor}
      appliedColor={appliedColor}
      onChange={onChange}
    />
  );
};
