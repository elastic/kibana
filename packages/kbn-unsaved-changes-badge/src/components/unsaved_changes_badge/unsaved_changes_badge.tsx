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
  reverting = 'reverting',
  saving = 'saving',
  savingAs = 'savingAs',
}

/**
 * Props for UnsavedChangesBadge
 */
export interface UnsavedChangesBadgeProps {
  onRevert: () => Promise<unknown>;
  onSave?: () => Promise<unknown>;
  onSaveAs?: () => Promise<unknown>;
  badgeText: string;
}

/**
 * Badge component. It opens a menu panel with actions once pressed.
 * @param badgeText
 * @param onRevert
 * @param onSave
 * @param onSaveAs
 * @constructor
 */
export const UnsavedChangesBadge: React.FC<UnsavedChangesBadgeProps> = ({
  badgeText,
  onRevert,
  onSave,
  onSaveAs,
}) => {
  const isMounted = useMountedState();
  const [processingType, setProcessingType] = useState<ProcessingType | null>(null);
  const [isPopoverOpen, setPopover] = useState(false);
  const contextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'unsavedChangesPopover',
  });

  const togglePopover = () => {
    setPopover((value) => !value);
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
  const isReverting = processingType === ProcessingType.reverting;

  const items = [
    ...(onSave
      ? [
          <EuiContextMenuItem
            data-test-subj="saveUnsavedChangesButton"
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
            data-test-subj="saveUnsavedChangesAsButton"
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
      data-test-subj="revertUnsavedChangesButton"
      key="revert"
      icon="editorUndo"
      disabled={disabled}
      onClick={async () => {
        await handleMenuItem(ProcessingType.reverting, onRevert);
      }}
    >
      {isReverting
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
      onClick={togglePopover}
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
      <EuiContextMenuPanel size="s" items={items} data-test-subj="unsavedChangesBadgeMenuPanel" />
    </EuiPopover>
  );
};
