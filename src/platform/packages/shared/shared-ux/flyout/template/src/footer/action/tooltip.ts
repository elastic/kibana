/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { EuiToolTip } from '@elastic/eui';

interface TooltipButtonProps {
  hasAriaDisabled?: boolean;
}

/**
 * A natively disabled button fires no pointer events, so its tooltip could never open. EUI applies
 * `hasAriaDisabled` only while it treats the button as disabled, so defaulting it on leaves EUI to
 * decide which props disable the button.
 */
export const resolveTooltipButtonProps = <T extends TooltipButtonProps>(
  buttonProps: T,
  tooltip: ReactNode
): T =>
  tooltip ? { ...buttonProps, hasAriaDisabled: buttonProps.hasAriaDisabled ?? true } : buttonProps;

export const withTooltip = (button: ReactElement, tooltip: ReactNode): ReactElement =>
  tooltip ? React.createElement(EuiToolTip, { content: tooltip, children: button }) : button;
