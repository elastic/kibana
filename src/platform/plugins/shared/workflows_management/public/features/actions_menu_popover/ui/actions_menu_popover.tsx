/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiPopoverProps } from '@elastic/eui';
import { EuiPopover, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionsMenu } from './actions_menu';
import type { ActionsMenuProps } from './actions_menu';

interface ActionsMenuPopoverProps extends EuiPopoverProps, ActionsMenuProps {}

export const ActionsMenuPopover = React.memo(function ActionsMenuPopover({
  onActionSelected,
  commands,
  jumpToStepEntries,
  onCommandSelected,
  onJumpToStep,
  panelProps,
  ...props
}: ActionsMenuPopoverProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPopover
      panelPaddingSize="none"
      aria-label={i18n.translate('workflows.actionsMenu.modalTitle', {
        defaultMessage: 'Actions menu',
      })}
      hasArrow={false}
      display="block"
      initialFocus="[name='actions-menu-search']"
      panelProps={{
        css: css({
          borderRadius: euiTheme.border.radius.control,
          overflow: 'hidden',
        }),
        ...panelProps,
      }}
      {...props}
    >
      <ActionsMenu
        onActionSelected={onActionSelected}
        commands={commands}
        jumpToStepEntries={jumpToStepEntries}
        onCommandSelected={onCommandSelected}
        onJumpToStep={onJumpToStep}
      />
    </EuiPopover>
  );
});
