/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UnsavedCount } from './unsaved_count';
import { useFormStyles } from '../form.styles';

export const DATA_TEST_SUBJ_SAVE_BUTTON = 'settings-save-button';
export const DATA_TEST_SUBJ_CANCEL_BUTTON = 'settings-cancel-button';

/**
 * Props for a {@link BottomBar} component.
 */
export interface BottomBarProps {
  onSaveAll: () => void;
  onClearAllUnsaved: () => void;
  hasInvalidChanges: boolean;
  isLoading: boolean;
  unsavedChangesCount: number;
}

/**
 * Component for displaying the bottom bar of a {@link Form}.
 */
export const BottomBar = ({
  onSaveAll,
  onClearAllUnsaved,
  hasInvalidChanges,
  isLoading,
  unsavedChangesCount,
}: BottomBarProps) => {
  const { cssFormButton, cssFormUnsavedCount } = useFormStyles();

  return (
    <EuiBottomBar>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        responsive={false}
        gutterSize="s"
      >
        <EuiFlexItem grow={false} css={cssFormUnsavedCount}>
          <UnsavedCount unsavedCount={unsavedChangesCount} />
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            css={cssFormButton}
            color="text"
            size="s"
            iconType="cross"
            onClick={onClearAllUnsaved}
            data-test-subj={DATA_TEST_SUBJ_CANCEL_BUTTON}
          >
            {i18n.translate('management.settings.form.cancelButtonLabel', {
              defaultMessage: 'Cancel changes',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={
              hasInvalidChanges &&
              i18n.translate('management.settings.form.saveButtonTooltipWithInvalidChanges', {
                defaultMessage: 'Fix invalid settings before saving.',
              })
            }
          >
            <EuiButton
              css={cssFormButton}
              disabled={hasInvalidChanges}
              color="success"
              fill
              size="s"
              iconType="check"
              onClick={onSaveAll}
              isLoading={isLoading}
              data-test-subj={DATA_TEST_SUBJ_SAVE_BUTTON}
            >
              {i18n.translate('management.settings.form.saveButtonLabel', {
                defaultMessage: 'Save changes',
              })}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBottomBar>
  );
};
