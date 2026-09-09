/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiModal } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionsMenu } from './actions_menu';
import type { ActionsMenuProps } from './actions_menu';

interface ActionsMenuPopoverProps extends ActionsMenuProps {
  isOpen: boolean;
  closePopover: () => void;
}

const panelCss = css({
  width: 'min(920px, calc(100vw - 48px))',
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
  if (!isOpen) return null;

  return (
    <EuiModal
      onClose={closePopover}
      outsideClickCloses
      initialFocus="[name='actions-menu-search']"
      aria-label={i18n.translate('workflows.actionsMenu.modalAriaLabel', {
        defaultMessage: 'Actions menu',
      })}
      maxWidth={false}
      css={panelCss}
      data-test-subj="actionsMenuModal"
    >
      <ActionsMenu
        onActionSelected={onActionSelected}
        commands={commands}
        jumpToStepEntries={jumpToStepEntries}
        onCommandSelected={onCommandSelected}
        onJumpToStep={onJumpToStep}
      />
    </EuiModal>
  );
});
