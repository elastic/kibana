/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiPopover,
  EuiSplitButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const defaultCancelLabel = i18n.translate(
  'presentationUtil.managedEditorFooter.cancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

const defaultRunPreviewLabel = i18n.translate(
  'presentationUtil.managedEditorFooter.runPreviewButtonLabel',
  {
    defaultMessage: 'Run preview',
  }
);

const moreSaveOptionsLabel = i18n.translate(
  'presentationUtil.managedEditorFooter.moreSaveOptionsAriaLabel',
  {
    defaultMessage: 'More save options',
  }
);

export interface ManagedEditorFooterSaveMenuItem {
  name: string;
  onClick: () => void;
  'data-test-subj'?: string;
}

export interface ManagedEditorFooterProps {
  onCancel: () => void;
  cancelButtonLabel?: string;
  cancelButtonDataTestSubj?: string;

  /**
   * When provided, renders a "Run preview" button between Cancel and the save action.
   * Omit for editors whose edits apply to the preview immediately.
   */
  previewAction?: {
    onPreview: () => void;
    label?: string;
    isEnabled: boolean;
    'data-test-subj'?: string;
  };

  onSave: () => void;
  saveButtonLabel: string;
  isSaveDisabled?: boolean;
  isSaving?: boolean;
  saveButtonDataTestSubj?: string;
  /** Hides the save action, e.g. for users who can't save. */
  hideSave?: boolean;
  /**
   * When provided, the save action renders as a split button whose menu holds these items,
   * e.g. "Save as new…".
   */
  saveMenuItems?: ManagedEditorFooterSaveMenuItem[];
}

const SaveSplitButton = ({
  onSave,
  saveButtonLabel,
  isSaveDisabled,
  isSaving,
  saveButtonDataTestSubj,
  saveMenuItems,
}: Pick<
  ManagedEditorFooterProps,
  'onSave' | 'saveButtonLabel' | 'isSaveDisabled' | 'isSaving' | 'saveButtonDataTestSubj'
> & { saveMenuItems: ManagedEditorFooterSaveMenuItem[] }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isDisabled = isSaveDisabled || isSaving;

  return (
    <EuiPopover
      aria-label={moreSaveOptionsLabel}
      isOpen={isMenuOpen}
      closePopover={() => setIsMenuOpen(false)}
      panelPaddingSize="none"
      anchorPosition="upRight"
      button={
        <EuiSplitButton fill data-test-subj={saveButtonDataTestSubj}>
          <EuiSplitButton.ActionPrimary
            isLoading={isSaving}
            isDisabled={isDisabled}
            onClick={onSave}
            data-test-subj={saveButtonDataTestSubj ? `${saveButtonDataTestSubj}Primary` : undefined}
          >
            {saveButtonLabel}
          </EuiSplitButton.ActionPrimary>
          <EuiSplitButton.ActionSecondary
            iconType="chevronSingleDown"
            aria-label={moreSaveOptionsLabel}
            isDisabled={isSaving}
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
            data-test-subj={saveButtonDataTestSubj ? `${saveButtonDataTestSubj}Menu` : undefined}
          />
        </EuiSplitButton>
      }
    >
      <EuiContextMenuPanel
        items={saveMenuItems.map(({ name, onClick, 'data-test-subj': dataTestSubj }) => (
          <EuiContextMenuItem
            key={name}
            data-test-subj={dataTestSubj}
            onClick={() => {
              setIsMenuOpen(false);
              onClick();
            }}
          >
            {name}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};

/** Shared flyout footer for managed library editors. */
export const ManagedEditorFooter = ({
  onCancel,
  cancelButtonLabel = defaultCancelLabel,
  cancelButtonDataTestSubj,
  previewAction,
  onSave,
  saveButtonLabel,
  isSaveDisabled,
  isSaving,
  saveButtonDataTestSubj,
  hideSave,
  saveMenuItems,
}: ManagedEditorFooterProps) => {
  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty flush="left" onClick={onCancel} data-test-subj={cancelButtonDataTestSubj}>
            {cancelButtonLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            {previewAction ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="success"
                  iconType="play"
                  disabled={!previewAction.isEnabled}
                  onClick={previewAction.onPreview}
                  data-test-subj={previewAction['data-test-subj']}
                >
                  {previewAction.label ?? defaultRunPreviewLabel}
                </EuiButton>
              </EuiFlexItem>
            ) : null}
            {hideSave ? null : (
              <EuiFlexItem grow={false}>
                {saveMenuItems?.length ? (
                  <SaveSplitButton
                    onSave={onSave}
                    saveButtonLabel={saveButtonLabel}
                    isSaveDisabled={isSaveDisabled}
                    isSaving={isSaving}
                    saveButtonDataTestSubj={saveButtonDataTestSubj}
                    saveMenuItems={saveMenuItems}
                  />
                ) : (
                  <EuiButton
                    fill
                    isLoading={isSaving}
                    disabled={isSaveDisabled || isSaving}
                    onClick={onSave}
                    data-test-subj={saveButtonDataTestSubj}
                  >
                    {saveButtonLabel}
                  </EuiButton>
                )}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
