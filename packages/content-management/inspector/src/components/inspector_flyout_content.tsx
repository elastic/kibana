/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useState, useMemo } from 'react';
import type { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { Services } from '../services';
import type { Item } from '../types';
import { MetadataForm } from './metadata_form';
import { useMetadataForm } from './use_metadata_form';
import type { CustomValidators } from './use_metadata_form';

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
  item: Item;
  entityName: string;
  isReadonly?: boolean;
  services: Pick<Services, 'TagSelector' | 'TagList' | 'notifyError'>;
  onSave?: (args: {
    id: string;
    title: string;
    description?: string;
    tags: string[];
  }) => Promise<void>;
  customValidators?: CustomValidators;
  onCancel: () => void;
}

export const InspectorFlyoutContent: FC<Props> = ({
  item,
  entityName,
  isReadonly = true,
  services: { TagSelector, TagList, notifyError },
  onSave,
  onCancel,
  customValidators,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const i18nTexts = useMemo(() => getI18nTexts({ entityName }), [entityName]);
  const form = useMetadataForm({ item, customValidators });

  const onClickSave = useCallback(async () => {
    if (form.isValid && onSave && !form.getIsChangingValue()) {
      const id = item.id;
      const title = form.title.value;

      setIsSubmitting(true);

      try {
        await onSave({
          id,
          title,
          description: form.description.value,
          tags: form.tags.value,
        });
      } catch (error) {
        notifyError(
          <FormattedMessage
            id="contentManagement.inspector.metadataForm.unableToSaveDangerMessage"
            defaultMessage="Unable to save {entityName}"
            values={{ entityName }}
          />,
          error.message
        );
      } finally {
        setIsSubmitting(false);
      }
    }

    setIsSubmitted(true);
  }, [onSave, item.id, form, notifyError, entityName]);

  const onClickCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const iconCSS = css`
    margin-right: ${euiTheme.size.m};
  `;

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle data-test-subj="flyoutTitle">
          <h2>
            <EuiIcon type="inspect" css={iconCSS} size="l" />
            <span>{i18nTexts.title}</span>
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <MetadataForm
          form={{ ...form, isSubmitted }}
          isReadonly={isReadonly}
          tagsReferences={item.tags}
          TagList={TagList}
          TagSelector={TagSelector}
        />
      </EuiFlyoutBody>

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

            {isReadonly === false && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  onClick={onClickSave}
                  data-test-subj="saveButton"
                  fill
                  disabled={isSubmitted && !form.isValid}
                  isLoading={isSubmitting}
                >
                  {i18nTexts.saveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      </EuiFlyoutFooter>
    </>
  );
};
