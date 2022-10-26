/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useState } from 'react';
import type { FC } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';

const getI18nTexts = ({ entityName }: { entityName: string }) => ({
  title: i18n.translate('contentManagement.inspector.flyoutTitle', {
    defaultMessage: 'Inspector',
  }),
  saveButtonLabel: i18n.translate('contentManagement.inspector.saveButtonLabel', {
    defaultMessage: 'Update {entityName}',
    values: {
      entityName,
    },
  }),
  cancelButtonLabel: i18n.translate('contentManagement.inspector.cancelButtonLabel', {
    defaultMessage: 'Cancel',
  }),
});

export interface Props {
  item: {
    title: string;
    description?: string;
  };
  onSave(args: { title: string; desciption?: string }): Promise<void>;
  onCancel: () => void;
}

export const InspectorFlyoutContent: FC<Props> = ({ onSave, onCancel }) => {
  const i18nTexts = getI18nTexts({ entityName: 'Dashboard' });
  const [isSaving] = useState(false);
  const [isSubmitting] = useState(false);
  const [hasErrors] = useState(false);

  const onClickSave = useCallback(() => {
    return onSave({ title: 'changed', desciption: 'new' });
  }, [onSave]);

  const onClickCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle data-test-subj="flyoutTitle">
          <h2>
            <span>{i18nTexts.title}</span>
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>Here will be the body</EuiFlyoutBody>

      <EuiFlyoutFooter>
        <>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="cross"
                flush="left"
                onClick={onClickCancel}
                data-test-subj="closeFlyoutButton"
              >
                {i18nTexts.cancelButtonLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                color="primary"
                onClick={onClickSave}
                data-test-subj="fieldSaveButton"
                fill
                disabled={hasErrors}
                isLoading={isSaving || isSubmitting}
              >
                {i18nTexts.saveButtonLabel}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      </EuiFlyoutFooter>
    </>
  );
};
