/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';

export enum SubmittingType {
  savingAsAdHoc = 'savingAsAdHoc',
  persisting = 'persisting',
}

interface FooterProps {
  onCancel: () => void;
  onSubmit: (isAdHoc?: boolean) => void;
  onDuplicate?: () => void;
  submittingType: SubmittingType | undefined;
  submitDisabled: boolean;
  hasEditData: boolean;
  isPersisted: boolean;
  allowAdHoc: boolean;
  canSave: boolean;
  isManaged: boolean;
  isDuplicating: boolean;
}

const closeButtonLabel = i18n.translate('indexPatternEditor.editor.flyoutCloseButtonLabel', {
  defaultMessage: 'Close',
});

const saveButtonLabel = i18n.translate('indexPatternEditor.editor.flyoutSaveButtonLabel', {
  defaultMessage: 'Save data view to Kibana',
});

const editButtonLabel = i18n.translate('indexPatternEditor.editor.flyoutEditButtonLabel', {
  defaultMessage: 'Save',
});

const duplicateButtonLabel = i18n.translate(
  'indexPatternEditor.editor.flyoutDuplicateButtonLabel',
  {
    defaultMessage: 'Duplicate',
  }
);

const editUnpersistedButtonLabel = i18n.translate(
  'indexPatternEditor.editor.flyoutEditUnpersistedButtonLabel',
  {
    defaultMessage: 'Continue to use without saving',
  }
);

const exploreButtonLabel = i18n.translate('indexPatternEditor.editor.flyoutExploreButtonLabel', {
  defaultMessage: 'Use without saving',
});

export const Footer = ({
  onCancel,
  onSubmit,
  submittingType,
  submitDisabled,
  hasEditData,
  allowAdHoc,
  isPersisted,
  canSave,
  onDuplicate,
  isManaged,
  isDuplicating,
}: FooterProps) => {
  const isEditingAdHoc = hasEditData && !isPersisted;

  const isEditing = (canSave || isEditingAdHoc) && !isManaged;
  const showDuplicateButton = (canSave || isEditingAdHoc) && onDuplicate;

  const submitPersisted = () => {
    onSubmit(false);
  };
  const submitAdHoc = () => {
    onSubmit(true);
  };

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            flush="left"
            onClick={onCancel}
            data-test-subj="closeFlyoutButton"
          >
            {closeButtonLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" alignItems="center" wrap>
            {showDuplicateButton && (
              <EuiFlexItem grow={false}>
                <EuiButton color="primary" onClick={onDuplicate} data-test-subj="duplicateButton">
                  {duplicateButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            )}

            {allowAdHoc && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  onClick={submitAdHoc}
                  data-test-subj="exploreIndexPatternButton"
                  disabled={submitDisabled}
                  isLoading={submittingType === SubmittingType.savingAsAdHoc}
                  title={i18n.translate('indexPatternEditor.editor.flyoutExploreButtonTitle', {
                    defaultMessage: 'Use this data view without creating a saved object',
                  })}
                >
                  {exploreButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            )}

            {isEditing && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  onClick={submitPersisted}
                  data-test-subj="saveIndexPatternButton"
                  fill
                  disabled={submitDisabled}
                  isLoading={
                    submittingType === SubmittingType.persisting ||
                    (submittingType === SubmittingType.savingAsAdHoc && isEditingAdHoc)
                  }
                >
                  {hasEditData && !isDuplicating
                    ? isPersisted
                      ? editButtonLabel
                      : editUnpersistedButtonLabel
                    : saveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
