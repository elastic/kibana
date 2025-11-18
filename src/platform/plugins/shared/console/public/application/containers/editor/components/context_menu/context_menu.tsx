/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiLoadingSpinner,
} from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { NotificationsStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useServicesContext } from '../../../../contexts';
import { DEFAULT_LANGUAGE, AVAILABLE_LANGUAGES } from '../../../../../../common/constants';

interface Props {
  getDocumentation: () => Promise<string | null>;
  autoIndent: (ev: React.MouseEvent) => void;
  notifications: Pick<NotificationsStart, 'toasts'>;
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
  isKbnRequestSelected: boolean;
  onMenuOpen: () => void;
  onCopyAs: (language?: string) => Promise<void>;
}

const DELAY_FOR_HIDING_SPINNER = 500;

const getLanguageLabelByValue = (value: string) => {
  return AVAILABLE_LANGUAGES.find((lang) => lang.value === value)?.label || DEFAULT_LANGUAGE;
};

const getModifierKey = () => {
  const isMac = navigator.platform.toLowerCase().includes('mac');
  return isMac ? '⌘' : 'Ctrl';
};

export const ContextMenu = ({
  getDocumentation,
  autoIndent,
  notifications,
  currentLanguage,
  onLanguageChange,
  isKbnRequestSelected,
  onMenuOpen,
  onCopyAs,
}: Props) => {
  const {
    config: { isPackagedEnvironment },
  } = useServicesContext();

  // Detect OS for keyboard shortcut display
  const modifierKey = useMemo(() => getModifierKey(), []);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRequestConverterLoading, setRequestConverterLoading] = useState(false);

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const onCopyAsSubmit = useCallback(
    async (language?: string) => {
      const withLanguage = language || currentLanguage;

      // Show loading spinner
      setRequestConverterLoading(true);

      // When copying as worked as expected, close the context menu popover
      onCopyAs(withLanguage)
        .then(() => {
          setIsPopoverOpen(false);
        })
        .finally(() => {
          // Delay hiding the spinner to avoid flickering between the spinner and
          // the change language button
          setTimeout(() => {
            setRequestConverterLoading(false);
          }, DELAY_FOR_HIDING_SPINNER);
        });
    },
    [currentLanguage, onCopyAs]
  );

  const openDocs = useCallback(async () => {
    setIsPopoverOpen(false);
    const documentation = await getDocumentation();
    if (!documentation) {
      notifications.toasts.addWarning({
        title: i18n.translate('console.consoleMenu.missingDocumentationPage', {
          defaultMessage: 'Documentation page is not yet available for this API.',
        }),
      });
      return;
    }
    window.open(documentation, '_blank');
  }, [getDocumentation, notifications.toasts]);

  const handleAutoIndent = useCallback(
    (event: React.MouseEvent) => {
      setIsPopoverOpen(false);
      autoIndent(event);
    },
    [autoIndent]
  );

  const handleLanguageSelect = useCallback(
    (language: string) => {
      onLanguageChange(language);
      setIsPopoverOpen(false);
    },
    [onLanguageChange]
  );

  const button = (
    <EuiButtonIcon
      onClick={() => {
        setIsPopoverOpen((prev) => !prev);
        onMenuOpen();
      }}
      data-test-subj="toggleConsoleMenu"
      aria-label={i18n.translate('console.requestOptionsButtonAriaLabel', {
        defaultMessage: 'Request options',
      })}
      iconType="boxesVertical"
      iconSize="s"
    />
  );

  // Build panels for EuiContextMenu
  const panels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
    // Language selection panel (panel 1)
    const languageItems = AVAILABLE_LANGUAGES.flatMap((lang, index) => {
      const item = {
        name: lang.label,
        key: lang.value,
        'data-test-subj': `languageClientMenuItem-${lang.value}`,
        icon: currentLanguage === lang.value ? 'check' : 'empty',
        onClick: () => handleLanguageSelect(lang.value),
      };

      // Add separator after each item except the last one
      if (index < AVAILABLE_LANGUAGES.length - 1) {
        return [item, { isSeparator: true as const, key: `separator-${lang.value}` }];
      }

      return [item];
    });

    // Main menu items (panel 0)
    const mainItems = [
      ...(!isPackagedEnvironment
        ? [
            {
              name: (
                <FormattedMessage
                  id="console.monaco.requestOptions.copyToLanguageButtonLabel"
                  defaultMessage="Copy to {language}"
                  values={{ language: getLanguageLabelByValue(currentLanguage) }}
                />
              ),
              key: 'copyToLanguage',
              'data-test-subj': 'consoleMenuCopyToLanguage',
              icon: isRequestConverterLoading ? <EuiLoadingSpinner size="m" /> : 'copyClipboard',
              disabled: !window.navigator?.clipboard,
              onClick: () => onCopyAsSubmit(),
            },
            // Hide Language clients option for Kibana requests
            ...(!isKbnRequestSelected
              ? [
                  {
                    name: (
                      <FormattedMessage
                        id="console.monaco.requestOptions.changeLanguageButtonLabel"
                        defaultMessage="Change language"
                      />
                    ),
                    key: 'languageClients',
                    'data-test-subj': 'consoleMenuLanguageClients',
                    icon: 'editorCodeBlock',
                    panel: 1,
                  },
                ]
              : []),
          ]
        : []),
      {
        name: (
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="console.monaco.requestOptions.autoIndentButtonLabel"
                defaultMessage="Auto indent"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="consoleMenuAutoIndentShortcut">
                {modifierKey} + I
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        key: 'autoIndent',
        'data-test-subj': 'consoleMenuAutoIndent',
        icon: 'kqlFunction',
        onClick: handleAutoIndent,
      },
      {
        name: (
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="console.monaco.requestOptions.openDocumentationButtonLabel"
                defaultMessage="Open API reference"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="consoleMenuOpenDocsShortcut">
                {modifierKey} + /
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        key: 'openDocs',
        'data-test-subj': 'consoleMenuOpenDocs',
        icon: 'documentation',
        onClick: openDocs,
      },
    ];

    return [
      {
        id: 0,
        items: mainItems,
      },
      {
        id: 1,
        title: i18n.translate('console.consoleMenu.changeLanguagePanelTitle', {
          defaultMessage: 'Change language',
        }),
        items: languageItems,
      },
    ];
  }, [
    isPackagedEnvironment,
    isKbnRequestSelected,
    currentLanguage,
    isRequestConverterLoading,
    modifierKey,
    onCopyAsSubmit,
    handleAutoIndent,
    openDocs,
    handleLanguageSelect,
  ]);

  return (
    <EuiPopover
      id="contextMenu"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} data-test-subj="consoleMenu" />
    </EuiPopover>
  );
};
