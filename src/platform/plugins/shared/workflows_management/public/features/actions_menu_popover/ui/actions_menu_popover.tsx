/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPanel, EuiPortal } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect } from 'react';
import { ActionsMenu } from './actions_menu';
import type { ActionsMenuProps } from './actions_menu';

interface ActionsMenuPopoverProps extends ActionsMenuProps {
  isOpen: boolean;
  closePopover: () => void;
}

const backdropCss = css({
  position: 'fixed',
  inset: 0,
  zIndex: 2000,
});

const panelCss = css({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 2001,
  width: '1085px',
  overflow: 'hidden',
});

export const ActionsMenuPopover = React.memo(function ActionsMenuPopover({
  onActionSelected,
  commands,
  jumpToStepEntries,
  onCommandSelected,
  onJumpToStep,
  closePopover,
  isOpen,
}: ActionsMenuPopoverProps) {
  useEffect(() => {
    if (isOpen) {
      const el = document.querySelector("[name='actions-menu-search']") as HTMLElement | null;
      el?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <EuiPortal>
      <div css={backdropCss} onClick={closePopover} />
      <EuiPanel paddingSize="none" hasShadow css={panelCss}>
        <ActionsMenu
          onActionSelected={onActionSelected}
          commands={commands}
          jumpToStepEntries={jumpToStepEntries}
          onCommandSelected={onCommandSelected}
          onJumpToStep={onJumpToStep}
          onClose={closePopover}
        />
      </EuiPanel>
    </EuiPortal>
  );
});
