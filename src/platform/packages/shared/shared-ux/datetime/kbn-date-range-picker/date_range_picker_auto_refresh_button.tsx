/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';

import { EuiFormAppend } from '@elastic/eui';

import { autoRefreshButtonTexts } from './translations';
import { msToSeconds, formatAutoRefreshCountdown } from './utils';

/*
 * Tabular numerals give every digit the same advance width so the countdown string
 * does not shift horizontally when values tick (e.g. `00:09` → `00:10`).
 */
const labelStyles = css`
  font-variant-numeric: tabular-nums;
`;

export interface DateRangePickerAutoRefreshButtonProps {
  disabled: boolean;
  intervalMs: number;
  isPaused: boolean;
  onClick: () => void;
  secondsRemaining: number | null;
}

/**
 * Play / pause control for auto-refresh with a live `mm:ss` / `hh:mm:ss` countdown label.
 */
export function DateRangePickerAutoRefreshButton({
  disabled,
  intervalMs,
  isPaused,
  onClick,
  secondsRemaining,
}: DateRangePickerAutoRefreshButtonProps) {
  const intervalSeconds = msToSeconds(intervalMs);
  const countdownLabel =
    secondsRemaining !== null
      ? formatAutoRefreshCountdown(secondsRemaining)
      : formatAutoRefreshCountdown(intervalSeconds);
  const ariaLabel = isPaused
    ? autoRefreshButtonTexts.resumeAriaLabel(countdownLabel)
    : autoRefreshButtonTexts.pauseAriaLabel(countdownLabel);

  return (
    <EuiFormAppend
      element="button"
      iconLeft={isPaused ? 'play' : 'pause'}
      label={countdownLabel}
      onClick={onClick}
      isDisabled={disabled}
      aria-label={ariaLabel}
      data-test-subj="dateRangePickerAutoRefreshButton"
      css={labelStyles}
    />
  );
}
