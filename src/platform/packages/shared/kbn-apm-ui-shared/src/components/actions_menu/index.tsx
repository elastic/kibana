/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionGroups } from './types';
import { buildPanels } from './build_panels';

export type { ActionBase, ActionSubItem, Action, ActionGroup, ActionGroups } from './types';

interface ActionsMenuProps {
  actions: ActionGroups;
  id?: string;
  dataTestSubjPrefix?: string;
}

export function ActionsMenu({ actions, id, dataTestSubjPrefix = 'actionsMenu' }: ActionsMenuProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  const generatedId = useGeneratedHtmlId({ prefix: 'actionsMenu' });
  const resolvedId = id ?? generatedId;

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((prev) => !prev);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const panels = useMemo(
    () => buildPanels(actions, closePopover, euiTheme, dataTestSubjPrefix),
    [actions, closePopover, euiTheme, dataTestSubjPrefix]
  );

  const ariaLabel = i18n.translate('apmUiShared.actionsMenu.ariaLabel', {
    defaultMessage: 'Actions',
  });

  return (
    <EuiPopover
      id={resolvedId}
      aria-label={ariaLabel}
      button={
        <EuiToolTip content={ariaLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="boxesHorizontal"
            aria-label={ariaLabel}
            onClick={togglePopover}
          />
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
}
