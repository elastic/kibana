/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiBottomBar, EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormStyles } from '../form.styles';

interface BottomBarProps {
  saveAll: () => void;
  clearAllUnsaved: () => void;
}

export const BottomBar = ({ saveAll, clearAllUnsaved }: BottomBarProps) => {
  const { cssFormButton } = useFormStyles();

  return (
    <EuiBottomBar>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        responsive={false}
        gutterSize="s"
      >
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
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
          <EuiButton
            css={cssFormButton}
            color="success"
            fill
            size="s"
            iconType="check"
            onClick={saveAll}
            aria-describedby="aria-describedby.countOfUnsavedSettings"
            data-test-subj="advancedSetting-saveButton"
          >
            {i18n.translate('management.settings.form.saveButtonLabel', {
              defaultMessage: 'Save changes',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBottomBar>
  );
};
