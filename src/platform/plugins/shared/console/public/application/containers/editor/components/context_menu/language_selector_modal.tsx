/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo } from 'react';
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
  EuiSelectableOption,
  EuiLink,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AVAILABLE_LANGUAGES } from '../../../../../../common/constants';

interface Props {
  closeModal: () => void;
  onSubmit: (language: string) => void;
  currentLanguage: string;
  changeDefaultLanguage: (lang: string) => void;
}

const DEFAULT_BADGE = (
  <strong>
    <EuiTextColor color="subdued">
      {i18n.translate('console.requestPanel.contextMenu.defaultSelectedLanguage', {
        defaultMessage: 'Default',
      })}
    </EuiTextColor>
  </strong>
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
      ...(noOptionsSelected && option.key === selectedLanguage && { checked: 'on' }),
      append:
        option.key === selectedLanguage ? (
          DEFAULT_BADGE
        ) : (
          <EuiLink
            onClick={() => setSelectedLanguage(option.key!)}
            data-test-subj={`changeDefaultLanguageTo-${option.key}`}
          >
            {i18n.translate('console.requestPanel.contextMenu.defaultSelectedLanguage', {
              defaultMessage: 'Set as default',
            })}
          </EuiLink>
        ),
    }));
  }, [options, selectedLanguage, noOptionsSelected]);

  const onCopyCode = () => {
    const selectedOption = options.find((option) => option.checked);
    const language = selectedOption?.key || selectedLanguage;

    // If the default language is changed, update the local storage setting
    if (currentLanguage !== language) {
      changeDefaultLanguage(selectedLanguage);
    }

    onSubmit(language);
  };

  const onCloseModal = () => {
    changeDefaultLanguage(selectedLanguage);
    closeModal();
  };

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={onCloseModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="console.requestPanel.contextMenu.languageSelectorModalTitle"
            defaultMessage="Select a language"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiSelectable
          css={{ maxWidth: 550 }}
          options={optionsList as EuiSelectableOption[]}
          onChange={(changedOptions) => setOptions(changedOptions)}
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
        <EuiButtonEmpty onClick={onCloseModal} data-test-subj="closeCopyAsModal">
          <FormattedMessage
            id="console.requestPanel.contextMenu.languageSelectorModalCancel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton onClick={onCopyCode} fill data-test-subj="copyAsLanguageSubmit">
          <FormattedMessage
            id="console.requestPanel.contextMenu.languageSelectorModalCopy"
            defaultMessage="Copy code"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
