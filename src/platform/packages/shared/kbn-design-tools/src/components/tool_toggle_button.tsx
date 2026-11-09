/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { MouseEvent } from 'react';
import { EuiButtonIcon, EuiToolTip, EuiWindowEvent } from '@elastic/eui';

export interface ToolToggleButtonProps {
  isActive: boolean;
  onToggle: () => void;
  handleKeydown: (event: KeyboardEvent) => void;
  iconType: string;
  activeTooltip?: string;
  inactiveTooltip: string;
  ariaLabel: string;
  testSubj: string;
}

/** Toolbar icon button that toggles a tool mode via click or window keydown shortcut. */
export const ToolToggleButton = ({
  isActive,
  onToggle,
  handleKeydown,
  iconType,
  activeTooltip,
  inactiveTooltip,
  ariaLabel,
  testSubj,
}: ToolToggleButtonProps) => {
  const preventTargetFromLosingFocus = (event: MouseEvent) => {
    event.preventDefault();
  };

  return (
    <>
      <EuiWindowEvent event="keydown" handler={handleKeydown} />
      <EuiToolTip content={isActive ? activeTooltip ?? '' : inactiveTooltip}>
        <EuiButtonIcon
          onClick={onToggle}
          onMouseDown={preventTargetFromLosingFocus}
          iconType={iconType}
          isSelected={isActive}
          aria-pressed={isActive}
          aria-label={ariaLabel}
          color="text"
          data-test-subj={testSubj}
        />
      </EuiToolTip>
    </>
  );
};
