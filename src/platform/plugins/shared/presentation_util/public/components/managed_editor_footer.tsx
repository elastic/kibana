/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
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

  /**
   * When non-empty, the save button renders as a split button with these items in an overflow
   * menu. The `onSave` and `isSaveDisabled` props control the primary action; each menu item
   * has its own `onClick`.
   */
  saveMenuItems?: Array<{
    label: string;
    iconType?: string;
    onClick: () => void;
    'data-test-subj'?: string;
  }>;
  /** Aria label for the split-button secondary trigger. */
  saveMenuAriaLabel?: string;
  saveMenuButtonDataTestSubj?: string;
}

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
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isLoading={isSaving}
                disabled={isSaveDisabled || isSaving}
                onClick={onSave}
                data-test-subj={saveButtonDataTestSubj}
              >
                {saveButtonLabel}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
