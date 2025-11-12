/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import type { NotificationsStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { EditorRequest } from '../../types';

import { useServicesContext } from '../../../../contexts';
import { DEFAULT_LANGUAGE, AVAILABLE_LANGUAGES } from '../../../../../../common/constants';

interface Props {
  getRequests: () => Promise<EditorRequest[]>;
  getDocumentation: () => Promise<string | null>;
  autoIndent: (ev: React.MouseEvent) => void;
  notifications: Pick<NotificationsStart, 'toasts'>;
  /* A function that returns true if any of the selected requests is an internal Kibana request
   * (starting with the kbn: prefix). This is needed here as we display only the curl language
   * for internal Kibana requests since the other languages are not supported yet. */
  getIsKbnRequestSelected: () => Promise<boolean | null>;
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

export const ContextMenu = ({
  getRequests,
  getDocumentation,
  autoIndent,
  notifications,
  getIsKbnRequestSelected,
  currentLanguage,
  onLanguageChange,
  isKbnRequestSelected,
  onMenuOpen,
  onCopyAs,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const {
    config: { isPackagedEnvironment },
  } = useServicesContext();

  // Detect OS for keyboard shortcut display
  const isMac = navigator.platform.toLowerCase().includes('mac');
  const modifierKey = isMac ? '⌘' : 'Ctrl';

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRequestConverterLoading, setRequestConverterLoading] = useState(false);
  const [isLanguageSelectorVisible, setLanguageSelectorVisibility] = useState(false);

  const onCopyAsSubmit = async (language?: string) => {
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
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
    setLanguageSelectorVisibility(false);
  };

  const openDocs = async () => {
    closePopover();
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
  };

  const handleAutoIndent = (event: React.MouseEvent) => {
    closePopover();
    autoIndent(event);
  };

  const handleLanguageSelect = (language: string) => {
    onLanguageChange(language);
    setLanguageSelectorVisibility(false);
  };

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

  // Create the language clients menu items
  const languageClientsItems = AVAILABLE_LANGUAGES.map((lang) => (
    <EuiContextMenuItem
      key={lang.value}
      data-test-subj={`languageClientMenuItem-${lang.value}`}
      icon={currentLanguage === lang.value ? 'check' : 'empty'}
      onClick={() => handleLanguageSelect(lang.value)}
    >
      {lang.label}
    </EuiContextMenuItem>
  ));

  // Main menu items
  const mainMenuItems = [
    ...(!isPackagedEnvironment
      ? [
          <EuiContextMenuItem
            key="Copy to language"
            data-test-subj="consoleMenuCopyToLanguage"
            id="copyToLanguage"
            disabled={!window.navigator?.clipboard}
            onClick={() => {
              onCopyAsSubmit();
            }}
            icon={isRequestConverterLoading ? <EuiLoadingSpinner size="m" /> : 'copyClipboard'}
          >
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <FormattedMessage
                  id="console.monaco.requestOptions.copyToLanguageButtonLabel"
                  defaultMessage="Copy to language"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="consoleMenuLanguageBadge">
                  {getLanguageLabelByValue(currentLanguage)}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiContextMenuItem>,
          // Hide Language clients option for Kibana requests
          ...(!isKbnRequestSelected
            ? [
                <EuiContextMenuItem
                  key="Language clients"
                  data-test-subj="consoleMenuLanguageClients"
                  id="languageClients"
                  onClick={() => setLanguageSelectorVisibility(true)}
                  icon="editorCodeBlock"
                >
                  <EuiFlexGroup
                    alignItems="center"
                    justifyContent="spaceBetween"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <FormattedMessage
                        id="console.monaco.requestOptions.languageClientsButtonLabel"
                        defaultMessage="Language clients"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <span style={{ fontSize: euiTheme.size.l }}>›</span>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiContextMenuItem>,
              ]
            : []),
        ]
      : []),
    <EuiContextMenuItem
      data-test-subj="consoleMenuAutoIndent"
      key="Auto indent"
      onClick={handleAutoIndent}
      icon="kqlFunction"
    >
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
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="Open documentation"
      data-test-subj="consoleMenuOpenDocs"
      onClick={openDocs}
      icon="documentation"
    >
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
    </EuiContextMenuItem>,
  ];

  // Determine which items and title to show based on language selector visibility
  const items = isLanguageSelectorVisible ? languageClientsItems : mainMenuItems;

  const title = isLanguageSelectorVisible ? (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          size="s"
          iconType="arrowLeft"
          aria-label={i18n.translate('console.consoleMenu.languageClientsBackAriaLabel', {
            defaultMessage: 'Back to main menu',
          })}
          onClick={() => setLanguageSelectorVisibility(false)}
          data-test-subj="languageClientsPanelBackButton"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <strong>
          {i18n.translate('console.consoleMenu.languageClientsPanelTitle', {
            defaultMessage: 'Language clients',
          })}
        </strong>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : undefined;

  return (
    <EuiPopover
      id="contextMenu"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel items={items} title={title} data-test-subj="consoleMenu" />
    </EuiPopover>
  );
};
