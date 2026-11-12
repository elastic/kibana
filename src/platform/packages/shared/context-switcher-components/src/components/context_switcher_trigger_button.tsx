/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactElement, SVGProps } from 'react';
import { EuiButtonEmpty, EuiIcon, useEuiTheme } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { css } from '@emotion/react';
import { POPOVER_WIDTH_PX } from './types';

const ChevronUpDownIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" {...props}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.7 2.4a1 1 0 0 0-1.4 0L4.46 5.22l-.53.53L5 6.81l.53-.53L8 3.81l2.47 2.47.53.53 1.06-1.06-.53-.53zM5.54 9.72 5 9.19l-1.06 1.06.53.53 2.82 2.82a1 1 0 0 0 1.42 0l2.82-2.82.53-.53L11 9.19l-.53.53L8 12.19z"
    />
  </svg>
);

interface ContextSwitcherTriggerButtonProps {
  readonly label: string;
  readonly spaceName: string;
  readonly onClick: () => void;
  readonly isSelected?: boolean;
  /** Original trigger shows the solution logo on the left and a down arrow. */
  readonly solutionIcon?: IconType;
}

/**
 * Trigger button for the space switcher. Shows the active space name.
 */
export const ContextSwitcherTriggerButton = ({
  label,
  spaceName,
  onClick,
  isSelected,
  solutionIcon,
}: ContextSwitcherTriggerButtonProps): ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiButtonEmpty
      color="text"
      size="s"
      onClick={onClick}
      iconType={solutionIcon ? 'chevronSingleDown' : ChevronUpDownIcon}
      iconSide="right"
      isSelected={isSelected}
      data-space-name={spaceName}
      data-test-subj="contextSwitcherTriggerButton"
      css={css`
        max-inline-size: ${POPOVER_WIDTH_PX}px;
        color: ${euiTheme.colors.textSubdued};
        background-color: ${isSelected
          ? euiTheme.components.buttons.backgroundEmptyTextHover
          : 'transparent'};
      `}
    >
      {solutionIcon ? (
        <>
          <EuiIcon type={solutionIcon} size="m" aria-hidden={true} />
          <span
            css={css`
              padding-left: ${euiTheme.size.s};
            `}
          >
            {label}
          </span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </EuiButtonEmpty>
  );
};
