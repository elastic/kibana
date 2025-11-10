/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  useEuiTheme,
} from '@elastic/eui';
import type { NotificationsStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { LanguageSelectorModal } from './language_selector_modal';
import { convertRequestToLanguage } from '../../../../../services';
import type { EditorRequest } from '../../types';

import { useServicesContext } from '../../../../contexts';
import { StorageKeys } from '../../../../../services';
import {
  DEFAULT_LANGUAGE,
  AVAILABLE_LANGUAGES,
  KIBANA_API_PREFIX,
} from '../../../../../../common/constants';

interface Props {
  getRequests: () => Promise<EditorRequest[]>;
  getDocumentation: () => Promise<string | null>;
  autoIndent: (ev: React.MouseEvent) => void;
  notifications: Pick<NotificationsStart, 'toasts'>;
  /* A function that returns true if any of the selected requests is an internal Kibana request
   * (starting with the kbn: prefix). This is needed here as we display only the curl language
   * for internal Kibana requests since the other languages are not supported yet. */
  getIsKbnRequestSelected: () => Promise<boolean | null>;
}

const getLanguageLabelByValue = (value: string) => {
  return AVAILABLE_LANGUAGES.find((lang) => lang.value === value)?.label || DEFAULT_LANGUAGE;
};

export const ContextMenu = ({
  getRequests,
  getDocumentation,
  autoIndent,
  notifications,
  getIsKbnRequestSelected,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  // Get default language from local storage
  const {
    services: { storage, esHostService },
    config: { isPackagedEnvironment },
  } = useServicesContext();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isLanguageSelectorVisible, setLanguageSelectorVisibility] = useState(false);
  const [isKbnRequestSelected, setIsKbnRequestSelected] = useState<boolean | null>(null);
  const [defaultLanguage, setDefaultLanguage] = useState(
    storage.get(StorageKeys.DEFAULT_LANGUAGE, DEFAULT_LANGUAGE)
  );
  const [currentLanguage, setCurrentLanguage] = useState(defaultLanguage);
  const [activePanelId, setActivePanelId] = useState<string>('main');

  useEffect(() => {
    if (isKbnRequestSelected) {
      setCurrentLanguage(DEFAULT_LANGUAGE);
    } else {
      setCurrentLanguage(defaultLanguage);
    }
  }, [defaultLanguage, isKbnRequestSelected]);

  const copyText = async (text: string) => {
    if (window.navigator?.clipboard) {
      await window.navigator.clipboard.writeText(text);
      return;
    }
    throw new Error('Could not copy to clipboard!');
  };

  // This function will convert all the selected requests to the language by
  // calling convertRequestToLanguage and then copy the data to clipboard.
  const copyAs = async (language?: string) => {
    // Get the language we want to convert the requests to
    const withLanguage = language || currentLanguage;
    // Get all the selected requests
    const requests = await getRequests();

    // If we have any kbn requests, we should not allow the user to copy as
    // anything other than curl
    const hasKbnRequests = requests.some((req) => req.url.startsWith(KIBANA_API_PREFIX));

    if (hasKbnRequests && withLanguage !== 'curl') {
      notifications.toasts.addDanger({
        title: i18n.translate('console.consoleMenu.copyAsMixedRequestsMessage', {
          defaultMessage: 'Kibana requests can only be copied as curl',
        }),
      });

      return;
    }

    const { data: requestsAsCode, error: requestError } = await convertRequestToLanguage({
      language: withLanguage,
      esHost: esHostService.getHost(),
      kibanaHost: window.location.origin,
      requests,
    });

    if (requestError) {
      notifications.toasts.addDanger({
        title: i18n.translate('console.consoleMenu.copyAsFailedMessage', {
          defaultMessage:
            '{requestsCount, plural, one {Request} other {Requests}} could not be copied to clipboard',
          values: { requestsCount: requests.length },
        }),
      });

      return;
    }

    notifications.toasts.addSuccess({
      title: i18n.translate('console.consoleMenu.copyAsSuccessMessage', {
        defaultMessage:
          '{requestsCount, plural, one {Request} other {Requests}} copied to clipboard as {language}',
        values: { language: getLanguageLabelByValue(withLanguage), requestsCount: requests.length },
      }),
    });

    await copyText(requestsAsCode);
  };

  const checkIsKbnRequestSelected = async () => {
    setIsKbnRequestSelected(await getIsKbnRequestSelected());
  };

  const onCopyAsSubmit = async (language?: string) => {
    const withLanguage = language || currentLanguage;

    // Close language selector modal
    setLanguageSelectorVisibility(false);

    // When copying as worked as expected, close the context menu popover
    copyAs(withLanguage).then(() => {
      setIsPopoverOpen(false);
    });
  };

  const changeDefaultLanguage = (language: string) => {
    if (currentLanguage !== language) {
      storage.set(StorageKeys.DEFAULT_LANGUAGE, language);
    }

    setDefaultLanguage(language);
    if (!isKbnRequestSelected) {
      setCurrentLanguage(language);
    }
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
    setActivePanelId('main');
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
    changeDefaultLanguage(language);
    setActivePanelId('main');
  };

  const button = (
    <EuiButtonIcon
      onClick={() => {
        setIsPopoverOpen((prev) => !prev);
        checkIsKbnRequestSelected();
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
            icon="copyClipboard"
          >
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <FormattedMessage
                  id="console.monaco.requestOptions.copyToLanguageButtonLabel"
                  defaultMessage="Copy to language"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{getLanguageLabelByValue(currentLanguage)}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="Language clients"
            data-test-subj="consoleMenuLanguageClients"
            id="languageClients"
            disabled={isKbnRequestSelected || false}
            onClick={() => setActivePanelId('languageClients')}
            icon="editorCodeBlock"
          >
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
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
    <EuiContextMenuItem
      data-test-subj="consoleMenuAutoIndent"
      key="Auto indent"
      onClick={handleAutoIndent}
      icon="kqlFunction"
    >
      <FormattedMessage
        id="console.monaco.requestOptions.autoIndentButtonLabel"
        defaultMessage="Auto indent"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="Open documentation"
      data-test-subj="consoleMenuOpenDocs"
      onClick={openDocs}
      icon="documentation"
    >
      <FormattedMessage
        id="console.monaco.requestOptions.openDocumentationButtonLabel"
        defaultMessage="Open API reference"
      />
    </EuiContextMenuItem>,
  ];

  // Define panels for nested menu
  const panels = [
    {
      id: 'main',
      items: mainMenuItems,
    },
    {
      id: 'languageClients',
      title: i18n.translate('console.consoleMenu.languageClientsPanelTitle', {
        defaultMessage: 'Language clients',
      }),
      items: languageClientsItems,
    },
  ];

  const activePanel = panels.find((panel) => panel.id === activePanelId);

  // Custom title with back button for language clients panel
  const languageClientsTitle =
    activePanelId === 'languageClients' ? (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            size="s"
            iconType="arrowLeft"
            aria-label={i18n.translate('console.consoleMenu.languageClientsBackAriaLabel', {
              defaultMessage: 'Back to main menu',
            })}
            onClick={() => setActivePanelId('main')}
            data-test-subj="languageClientsPanelBackButton"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <strong>{activePanel?.title}</strong>
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      activePanel?.title
    );

  return (
    <>
      <EuiPopover
        id="contextMenu"
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          items={activePanel?.items}
          title={languageClientsTitle}
          data-test-subj="consoleMenu"
        />
      </EuiPopover>
      {isLanguageSelectorVisible && (
        <LanguageSelectorModal
          currentLanguage={currentLanguage}
          changeDefaultLanguage={changeDefaultLanguage}
          closeModal={() => setLanguageSelectorVisibility(false)}
          onSubmit={onCopyAsSubmit}
        />
      )}
    </>
  );
};
