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

interface BottomBarProps {
  saveAll: () => void;
  clearAllUnsaved: () => void;
  hasInvalidChanges: boolean;
  isLoading: boolean;
  unsavedChangesCount: number;
}

export const BottomBar = ({
  saveAll,
  clearAllUnsaved,
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
            color="ghost"
            size="s"
            iconType="cross"
            onClick={clearAllUnsaved}
            aria-describedby="aria-describedby.countOfUnsavedSettings"
            data-test-subj="advancedSetting-cancelButton"
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
              i18n.translate('advancedSettings.form.saveButtonTooltipWithInvalidChanges', {
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
              onClick={saveAll}
              aria-describedby="aria-describedby.countOfUnsavedSettings"
              isLoading={isLoading}
              data-test-subj="advancedSetting-saveButton"
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
