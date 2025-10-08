/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiPopoverProps } from '@elastic/eui';
import { EuiPopover } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionsMenu } from './actions_menu';
import type { ActionsMenuProps } from './actions_menu';

interface ActionsMenuPopoverProps extends EuiPopoverProps, ActionsMenuProps {}

export function ActionsMenuPopover({ onActionSelected, ...props }: ActionsMenuPopoverProps) {
  return (
    <EuiPopover
      panelPaddingSize="none"
      aria-label={i18n.translate('workflows.actionsMenu.modalTitle', {
        defaultMessage: 'Actions menu',
      })}
      hasArrow={false}
      display="block"
      initialFocus="[name='actions-menu-search']"
      {...props}
    >
      <ActionsMenu onActionSelected={onActionSelected} />
    </EuiPopover>
  );
}
