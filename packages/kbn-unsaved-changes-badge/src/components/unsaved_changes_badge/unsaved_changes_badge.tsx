/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import {
  EuiBadge,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

enum ProcessingType {
  resetting = 'resetting',
  saving = 'saving',
  savingAs = 'savingAs',
}

export interface UnsavedChangesBadgeProps {
  onReset: () => Promise<unknown>;
  onSave?: () => Promise<unknown>;
  onSaveAs?: () => Promise<unknown>;
  badgeText: string;
}

export const UnsavedChangesBadge: React.FC<UnsavedChangesBadgeProps> = ({
  badgeText,
  onReset,
  onSave,
  onSaveAs,
}) => {
  const isMounted = useMountedState();
  const [processingType, setProcessingType] = useState<ProcessingType | null>(null);
  const [isPopoverOpen, setPopover] = useState(false);
  const contextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'unsavedChangesPopover',
  });

  const openPopover = () => {
    setPopover(true);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const completeMenuItemAction = () => {
    if (isMounted()) {
      setProcessingType(null);
      closePopover();
    }
  };

  const handleMenuItem = async (type: ProcessingType, action: () => Promise<unknown>) => {
    try {
      setProcessingType(type);
      await action();
    } finally {
      completeMenuItemAction();
    }
  };

  const disabled = Boolean(processingType);
  const isSaving = processingType === ProcessingType.saving;
  const isSavingAs = processingType === ProcessingType.savingAs;
  const isResetting = processingType === ProcessingType.resetting;

  const items = [
    ...(onSave
      ? [
          <EuiContextMenuItem
            data-test-subj="saveUnsavedChangesMenuItem"
            key="save"
            icon="save"
            disabled={disabled}
            onClick={async () => {
              await handleMenuItem(ProcessingType.saving, onSave);
            }}
          >
            {isSaving
              ? i18n.translate('unsavedChangesBadge.contextMenu.savingChangesButtonStatus', {
                  defaultMessage: 'Saving...',
                })
              : i18n.translate('unsavedChangesBadge.contextMenu.saveChangesButton', {
                  defaultMessage: 'Save',
                })}
          </EuiContextMenuItem>,
        ]
      : []),
    ...(onSaveAs
      ? [
          <EuiContextMenuItem
            data-test-subj="saveUnsavedChangesAsMenuItem"
            key="saveAs"
            icon="save"
            disabled={disabled}
            onClick={async () => {
              await handleMenuItem(ProcessingType.savingAs, onSaveAs);
            }}
          >
            {isSavingAs
              ? i18n.translate('unsavedChangesBadge.contextMenu.savingChangesAsButtonStatus', {
                  defaultMessage: 'Saving as...',
                })
              : i18n.translate('unsavedChangesBadge.contextMenu.saveChangesAsButton', {
                  defaultMessage: 'Save as',
                })}
          </EuiContextMenuItem>,
        ]
      : []),
    <EuiContextMenuItem
      data-test-subj="resetUnsavedChangesMenuItem"
      key="reset"
      icon="returnKey"
      disabled={disabled}
      onClick={async () => {
        await handleMenuItem(ProcessingType.resetting, onReset);
      }}
    >
      {isResetting
        ? i18n.translate('unsavedChangesBadge.contextMenu.revertingChangesButtonStatus', {
            defaultMessage: 'Reverting changes...',
          })
        : i18n.translate('unsavedChangesBadge.contextMenu.revertChangesButton', {
            defaultMessage: 'Revert changes',
          })}
    </EuiContextMenuItem>,
  ];

  const button = (
    <EuiBadge
      data-test-subj="unsavedChangesBadge"
      color="warning"
      iconType="arrowDown"
      iconSide="right"
      onClick={openPopover}
      onClickAriaLabel={i18n.translate('unsavedChangesBadge.contextMenu.openButton', {
        defaultMessage: 'View available actions',
      })}
    >
      {badgeText}
    </EuiBadge>
  );

  return (
    <EuiPopover
      id={contextMenuPopoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
};
