/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

interface Props {
  closeModal: () => void;
  hidePopover: () => void;
  currentLanguage: string;
  changeDefaultLanguage: (lang: string) => void;
}

const AVAILABLE_LANGUAGES = ['cURL', 'Javascript', 'Ruby', 'Python'];
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
  hidePopover,
  currentLanguage,
  changeDefaultLanguage,
}: Props) => {
  const modalTitleId = useGeneratedHtmlId();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(currentLanguage);
  const [options, setOptions] = useState<EuiSelectableOption[]>(
    AVAILABLE_LANGUAGES.map((lang): EuiSelectableOption => ({ label: lang }))
  );

  const noOptionsSelected = options.every((option) => !option.checked);

  const optionsList = useMemo(() => {
    return options.map((option) => ({
      ...option,
      ...(noOptionsSelected && option.label === selectedLanguage && { checked: 'on' }),
      append:
        option.label === selectedLanguage ? (
          DEFAULT_BADGE
        ) : (
          <EuiLink onClick={() => setSelectedLanguage(option.label)}>
            {i18n.translate('console.requestPanel.contextMenu.defaultSelectedLanguage', {
              defaultMessage: 'Set as default',
            })}
          </EuiLink>
        ),
    }));
  }, [options, selectedLanguage, noOptionsSelected]);

  const onCopyCode = () => {
    const selectedOption = options.find((option) => option.checked);
    const language = selectedOption?.label || selectedLanguage;

    // If the default language is changed, update the local storage setting
    if (currentLanguage !== language) {
      changeDefaultLanguage(selectedLanguage);
    }

    closeModal();
    hidePopover();
  };

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={closeModal}>
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
        <EuiButtonEmpty onClick={closeModal}>
          <FormattedMessage
            id="console.requestPanel.contextMenu.languageSelectorModalCancel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton onClick={onCopyCode} fill>
          <FormattedMessage
            id="console.requestPanel.contextMenu.languageSelectorModalCopy"
            defaultMessage="Copy code"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
