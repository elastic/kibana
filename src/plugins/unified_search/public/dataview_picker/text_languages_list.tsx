/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSelectable, EuiPanel, EuiBadge } from '@elastic/eui';
import { TextBasedLanguages } from './data_view_picker';

export interface TextBasedLanguagesListProps {
  textBasedLanguages: TextBasedLanguages[];
  onChange: (lang: string) => void;
  selectedOption: string;
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default function TextBasedLanguagesList({
  textBasedLanguages,
  onChange,
  selectedOption,
}: TextBasedLanguagesListProps) {
  return (
    <EuiSelectable<{
      key?: string;
      label: string;
      value?: string;
      checked?: 'on' | 'off' | undefined;
    }>
      key="textbasedLanguages-options"
      data-test-subj="text-based-languages-switcher"
      singleSelection="always"
      options={textBasedLanguages.map((lang) => ({
        key: lang,
        label: lang,
        value: lang,
        checked: lang === selectedOption ? 'on' : undefined,
        append: (
          <EuiBadge color="hollow">
            {i18n.translate('unifiedSearch.query.queryBar.textBasedLanguagesTechPreviewLabel', {
              defaultMessage: 'Technical preview',
            })}
          </EuiBadge>
        ),
      }))}
      onChange={(choices) => {
        const choice = choices.find(({ checked }) => checked) as unknown as {
          value: string;
        };
        onChange(choice.value);
      }}
    >
      {(list) => (
        <EuiPanel color="transparent" paddingSize="none">
          {list}
        </EuiPanel>
      )}
    </EuiSelectable>
  );
}
