/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import { EuiHeaderLink, EuiPopover, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const SUPPORTED_LOCALES: Array<{ locale: string; label: string }> = [
  { locale: 'en', label: 'English' },
  { locale: 'fr-FR', label: 'Français' },
  { locale: 'ja-JP', label: '日本語' },
  { locale: 'zh-CN', label: '中文' },
  { locale: 'de-DE', label: 'Deutsch' },
];

const LOCALE_STORAGE_KEY = 'kibana.i18n.locale';

export const HeaderLanguageSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const currentLocale = i18n.getLocale();

  const options: EuiSelectableOption[] = SUPPORTED_LOCALES.map(({ locale, label }) => ({
    label: `${label} (${locale})`,
    key: locale,
    checked: locale.toLowerCase() === currentLocale.toLowerCase() ? 'on' : undefined,
  }));

  const onChange = useCallback((newOptions: EuiSelectableOption[]) => {
    const selected = newOptions.find((opt) => opt.checked === 'on');
    if (selected?.key) {
      localStorage.setItem(LOCALE_STORAGE_KEY, selected.key);
      window.alert(`Locale set to "${selected.key}". Please reload the page to apply the change.`);
      setIsOpen(false);
    }
  }, []);

  const currentLabel =
    SUPPORTED_LOCALES.find((l) => l.locale.toLowerCase() === currentLocale.toLowerCase())?.label ??
    currentLocale;

  return (
    <EuiPopover
      aria-label="Select language"
      button={
        <EuiHeaderLink
          iconType="globe"
          onClick={() => setIsOpen(!isOpen)}
          data-test-subj="languageSelectorButton"
          color="primary"
        >
          {currentLabel}
        </EuiHeaderLink>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiSelectable
        singleSelection="always"
        options={options}
        onChange={onChange}
        listProps={{ bordered: false }}
      >
        {(list) => <div style={{ width: 240 }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
};
