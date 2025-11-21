/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiButtonEmpty,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
  EuiSelectable,
  EuiBadge,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AVAILABLE_LANGUAGES } from '../../../../../../common/constants';

const styles = {
  constrainedSelectable: css`
    max-width: 550px;
  `,
};

interface Props {
  closeModal: () => void;
  onSubmit: (language: string) => void;
  currentLanguage: string;
  changeDefaultLanguage: (lang: string) => void;
}

const DEFAULT_BADGE = (
  <EuiBadge color="hollow">
    {i18n.translate('console.requestPanel.contextMenu.defaultSelectedLanguage', {
      defaultMessage: 'Default',
    })}
  </EuiBadge>
);

export const LanguageSelectorModal = ({
  closeModal,
  onSubmit,
  currentLanguage,
  changeDefaultLanguage,
}: Props) => {
  const modalTitleId = useGeneratedHtmlId();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(currentLanguage);
  const [options, setOptions] = useState<EuiSelectableOption[]>(
    AVAILABLE_LANGUAGES.map(
      (lang): EuiSelectableOption => ({
        label: lang.label,
        key: lang.value,
        'data-test-subj': `languageOption-${lang.value}`,
      })
    )
  );

  const noOptionsSelected = options.every((option) => !option.checked);

  const optionsList = useMemo(() => {
    return options.map((option) => ({
      ...option,
      ...(noOptionsSelected && option.key === currentLanguage && { checked: 'on' }),
      append: option.key === currentLanguage ? DEFAULT_BADGE : undefined,
    }));
  }, [options, currentLanguage, noOptionsSelected]);

  const handleOptionsChange = (changedOptions: EuiSelectableOption[]) => {
    setOptions(changedOptions);

    // Update selectedLanguage when user clicks a different option
    const checkedOption = changedOptions.find((option) => option.checked);
    if (checkedOption?.key) {
      setSelectedLanguage(checkedOption.key);
    }
  };

  const onCopyCode = () => {
    onSubmit(selectedLanguage);
  };

  const onSetAsDefault = () => {
    changeDefaultLanguage(selectedLanguage);
    // Keep modal open after setting default
  };

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="console.requestPanel.contextMenu.languageSelectorModalTitle"
            defaultMessage="Language clients"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="console.requestPanel.contextMenu.languageSelectorModalDescription"
              defaultMessage="Copy the selected code to your preferred client language."
            />
          </p>
        </EuiText>
        <EuiSelectable
          css={styles.constrainedSelectable}
          options={optionsList as EuiSelectableOption[]}
          onChange={handleOptionsChange}
          singleSelection="always"
          listProps={{
            onFocusBadge: false,
            isVirtualized: false,
          }}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeModal} data-test-subj="closeCopyAsModal">
          <FormattedMessage
            id="console.requestPanel.contextMenu.languageSelectorModalCancel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton onClick={onCopyCode} data-test-subj="copyAsLanguageSubmit">
          <FormattedMessage
            id="console.requestPanel.contextMenu.languageSelectorModalCopy"
            defaultMessage="Copy code"
          />
        </EuiButton>
        <EuiButton onClick={onSetAsDefault} fill data-test-subj="setAsDefaultLanguage">
          <FormattedMessage
            id="console.requestPanel.contextMenu.languageSelectorModalSetDefault"
            defaultMessage="Set as default"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
