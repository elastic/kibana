/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactElement } from 'react';
import type { IconType } from '@elastic/eui';
import { EuiButtonEmpty, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { POPOVER_WIDTH_PX } from './types';

interface ContextSwitcherTriggerButtonProps {
  readonly solutionIcon: IconType;
  readonly label: string;
  readonly onClick: () => void;
  readonly isSelected?: boolean;
}

/**
 * Trigger button UI for the context switcher popover.
 * Solution logo (left), space name (middle), down arrow (right).
 */
export const ContextSwitcherTriggerButton = ({
  solutionIcon,
  label,
  onClick,
  isSelected,
}: ContextSwitcherTriggerButtonProps): ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiButtonEmpty
      color="text"
      size="s"
      onClick={onClick}
      iconType="arrowDown"
      iconSide="right"
      isSelected={isSelected}
      data-test-subj="contextSwitcherTriggerButton"
      css={css`
        color: ${euiTheme.colors.textSubdued};
        max-inline-size: ${POPOVER_WIDTH_PX}px;
      `}
    >
      <EuiIcon type={solutionIcon} size="m" aria-hidden={true} />
      <span
        css={css`
          padding-left: ${euiTheme.size.s};
        `}
      >
        {label}
      </span>
    </EuiButtonEmpty>
  );
};
