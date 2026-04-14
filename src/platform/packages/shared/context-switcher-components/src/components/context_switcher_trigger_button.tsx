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
import { i18n } from '@kbn/i18n';

const CONTEXT_SWITCHER_BUTTON_ARIA_LABEL = i18n.translate(
  'contextSwitcherComponents.triggerButton.ariaLabel',
  {
    defaultMessage: 'Open context switcher',
  }
);

interface ContextSwitcherTriggerButtonProps {
  readonly solutionIcon: IconType;
  readonly spaceName: string;
  readonly onClick: () => void;
  readonly isSelected?: boolean;
}

/**
 * Trigger button UI for the context switcher popover.
 * Solution logo (left), space name (middle), down arrow (right).
 */
export const ContextSwitcherTriggerButton = ({
  solutionIcon,
  spaceName,
  onClick,
  isSelected,
}: ContextSwitcherTriggerButtonProps): ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiButtonEmpty
      color="text"
      size="m"
      onClick={onClick}
      iconType="arrowDown"
      iconSide="right"
      isSelected={isSelected}
      aria-label={CONTEXT_SWITCHER_BUTTON_ARIA_LABEL}
      data-test-subj="contextSwitcherTriggerButton"
    >
      <EuiIcon type={solutionIcon} size="m" aria-hidden={true} />
      <span
        css={css`
          padding-left: ${euiTheme.size.s};
        `}
      >
        {spaceName}
      </span>
    </EuiButtonEmpty>
  );
};
