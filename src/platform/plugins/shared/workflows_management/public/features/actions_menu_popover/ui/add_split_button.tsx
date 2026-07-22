/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiPopoverProps } from '@elastic/eui';
import { EuiContextMenuItem, EuiContextMenuPanel, EuiSplitButton } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface AddSplitButtonProps {
  onAdd: () => void;
  onConfigureAndAdd: () => void;
  fill?: boolean;
  size?: 's' | 'm';
  anchorPosition?: EuiPopoverProps['anchorPosition'];
  addTestSubj?: string;
  menuTestSubj?: string;
  configureTestSubj?: string;
}

export function AddSplitButton({
  onAdd,
  onConfigureAndAdd,
  fill = true,
  size = 's',
  anchorPosition = 'downRight',
  addTestSubj = 'actionsMenuAdd',
  menuTestSubj = 'actionsMenuAddMenu',
  configureTestSubj = 'actionsMenuConfigureAndAdd',
}: AddSplitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = useCallback(() => setIsOpen(false), []);

  const handleConfigureAndAdd = useCallback(() => {
    closeMenu();
    onConfigureAndAdd();
  }, [closeMenu, onConfigureAndAdd]);

  return (
    <EuiSplitButton fill={fill} size={size}>
      <EuiSplitButton.ActionPrimary
        iconType="plus"
        onClick={onAdd}
        data-test-subj={addTestSubj}
      >
        <FormattedMessage id="workflows.actionsMenu.preview.add" defaultMessage="Add" />
      </EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        aria-label={i18n.translate('workflows.actionsMenu.preview.addOptionsAriaLabel', {
          defaultMessage: 'More add options',
        })}
        data-test-subj={menuTestSubj}
        onClick={() => setIsOpen((open) => !open)}
        popoverProps={{
          isOpen,
          closePopover: closeMenu,
          panelPaddingSize: 'none',
          anchorPosition,
          children: (
            <EuiContextMenuPanel
              size="s"
              items={[
                <EuiContextMenuItem
                  key="configure"
                  icon="controlsHorizontal"
                  onClick={handleConfigureAndAdd}
                  data-test-subj={configureTestSubj}
                >
                  <FormattedMessage
                    id="workflows.actionsMenu.preview.configureAndAdd"
                    defaultMessage="Configure and add"
                  />
                </EuiContextMenuItem>,
              ]}
            />
          ),
        }}
      />
    </EuiSplitButton>
  );
}
