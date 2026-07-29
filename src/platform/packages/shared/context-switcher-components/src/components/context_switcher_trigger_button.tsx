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
import { EuiButtonEmpty, EuiButtonIcon, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { POPOVER_WIDTH_PX } from './types';

interface ContextSwitcherTriggerButtonProps {
  readonly solutionIcon: IconType;
  readonly label: string;
  readonly onClick: () => void;
  readonly isSelected?: boolean;
  readonly title?: string;
  readonly iconOnly?: boolean;
  /** When `iconOnly`, show the space name beside the grid icon. */
  readonly showLabel?: boolean;
}

/**
 * Trigger button UI for the context switcher popover.
 * Solution logo (left), space name (middle), down arrow (right).
 * When `iconOnly`, renders a grid ("apps") icon button for nav chrome.
 * When `iconOnly` + `showLabel`, renders grid icon + space name for expanded nav.
 */
export const ContextSwitcherTriggerButton = ({
  solutionIcon,
  label,
  onClick,
  isSelected,
  title,
  iconOnly = false,
  showLabel = false,
}: ContextSwitcherTriggerButtonProps): ReactElement => {
  const { euiTheme } = useEuiTheme();

  if (iconOnly) {
    if (showLabel) {
      return (
        <EuiButtonEmpty
          aria-label={label}
          color="text"
          data-test-subj="contextSwitcherTriggerButton"
          iconType="apps"
          isSelected={isSelected}
          onClick={onClick}
          size="s"
          css={css`
            width: 100%;
            justify-content: flex-start;
            min-inline-size: 0;
            color: ${euiTheme.colors.textParagraph};

            .euiButtonEmpty__content {
              justify-content: flex-start;
              gap: ${euiTheme.size.s};
            }

            .euiButtonEmpty__text {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          `}
        >
          {label}
        </EuiButtonEmpty>
      );
    }

    return (
      <EuiButtonIcon
        aria-label={label}
        color={isSelected ? 'primary' : 'text'}
        data-test-subj="contextSwitcherTriggerButton"
        display={isSelected ? 'base' : 'empty'}
        iconType="apps"
        onClick={onClick}
        size="s"
      />
    );
  }

  return (
    <EuiButtonEmpty
      color="text"
      size="s"
      onClick={onClick}
      iconType="chevronSingleDown"
      iconSide="right"
      isSelected={isSelected}
      title={title}
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
