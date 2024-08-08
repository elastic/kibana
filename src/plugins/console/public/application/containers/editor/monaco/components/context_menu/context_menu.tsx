/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { NotificationsSetup } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { LanguageSelectorModal } from './language_selector_modal';
import { convertRequestToLanguage } from '../../../../../../services';

import { useServicesContext } from '../../../../../contexts';
import { StorageKeys } from '../../../../../../services';
import { DEFAULT_LANGUAGE } from '../../../../../../../common/constants';

interface Props {
  getRequests: () => Promise<any>;
  getDocumentation: () => Promise<string | null>;
  autoIndent: (ev: React.MouseEvent) => void;
  notifications: NotificationsSetup;
}

const DELAY_FOR_HIDING_SPINNER = 500;

export const ContextMenu = ({
  getRequests,
  getDocumentation,
  autoIndent,
  notifications,
}: Props) => {
  // Get default language from local storage
  const {
    services: { storage, esHostService },
  } = useServicesContext();
  const defaultLanguage = storage.get(StorageKeys.DEFAULT_LANGUAGE, DEFAULT_LANGUAGE);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRequestConverterLoading, setRequestConverterLoading] = useState(false);
  const [isLanguageSelectorVisible, setLanguageSelectorVisibility] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(defaultLanguage);

  const copyText = async (text: string) => {
    if (window.navigator?.clipboard) {
      await window.navigator.clipboard.writeText(text);
      return;
    }
    throw new Error('Could not copy to clipboard!');
  };

  // This function will convert all the selected requests to the language by
  // calling convertRequestToLanguage for each request and then copy the data
  // to clipboard.
  const copyAs = async (language?: string) => {
    // Get the language we want to convert the requests to
    const withLanguage = (language || currentLanguage).toLowerCase();
    // Get all the selected requests
    const requests = await getRequests();

    // Convert each request using convertRequestToLanguage and handle all promises
    const results = await Promise.allSettled(
      requests.map((request: any) =>
        convertRequestToLanguage({
          method: request.method,
          path: request.url,
          body: request.data,
          language: withLanguage,
          esHost: esHostService.getHost(),
        })
      )
    );

    // Aggregate data and log errors
    let aggregatedData = '';
    let hasErrors = false;

    results.forEach((result) => {
      if (result.status === 'fulfilled' && !result.value.error) {
        aggregatedData += result.value.data + '\n';
      } else {
        hasErrors = true;
      }
    });

    // If we dont have data and have errors, we should show an error toast saying
    // that no requests could be converted
    if (aggregatedData === '' && hasErrors) {
      const error = new Error(`Failed to convert request to ${withLanguage}`);
      notifications.toasts.addError(error, {
        title: i18n.translate('console.consoleMenu.copyAsCurlFailedMessage', {
          defaultMessage:
            '{requestsCount, plural, one {Request} other {Requests}} could not be copied to clipboard',
          values: { requestsCount: requests.length },
        }),
      });

      return Promise.reject(error);
    } else {
      // If we have data and errors, we should show a warning toast saying that
      // some requests could not be converted and copy the rest to clipboard
      if (aggregatedData !== '' && hasErrors) {
        notifications.toasts.addWarning({
          title: i18n.translate('console.consoleMenu.copyAsCurlSuccessWithWarning', {
            defaultMessage: 'Some requests could not be copied to clipboard',
          }),
        });
        // Otherwise we can just copy the data to clipboard
      } else {
        notifications.toasts.add({
          title: i18n.translate('console.consoleMenu.copyAsSuccessMessage', {
            defaultMessage:
              '{requestsCount, plural, one {Request} other {Requests}} copied to clipboard as {language}',
            values: { language: withLanguage, requestsCount: requests.length },
          }),
        });
      }

      // Regardless of whether there was a warniing or not, we should copy the
      // data to clipboard
      await copyText(aggregatedData);
    }

    return Promise.resolve();
  };

  const onCopyAsSubmit = async (language?: string) => {
    const withLanguage = language || currentLanguage;

    // Close language selector modal
    setLanguageSelectorVisibility(false);
    // Show loading spinner
    setRequestConverterLoading(true);

    // When copying as worked as expected, close the context menu popover
    copyAs(withLanguage)
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

  const changeDefaultLanguage = (language: string) => {
    // If default language has changed, update local storage
    if (currentLanguage !== language) {
      storage.set(StorageKeys.DEFAULT_LANGUAGE, language);
    }

    setCurrentLanguage(language);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const openDocs = async () => {
    closePopover();
    const documentation = await getDocumentation();
    if (!documentation) {
      return;
    }
    window.open(documentation, '_blank');
  };

  const handleAutoIndent = (event: React.MouseEvent) => {
    closePopover();
    autoIndent(event);
  };

  const button = (
    <EuiLink
      onClick={() => setIsPopoverOpen((prev) => !prev)}
      data-test-subj="toggleConsoleMenu"
      aria-label={i18n.translate('console.requestOptionsButtonAriaLabel', {
        defaultMessage: 'Request options',
      })}
    >
      <EuiIcon type="boxesVertical" />
    </EuiLink>
  );

  const items = [
    <EuiContextMenuItem
      key="Copy as"
      data-test-subj="consoleMenuCopyAsButton"
      id="copyAs"
      disabled={!window.navigator?.clipboard}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        const target = e.target as HTMLButtonElement;

        if (target.dataset.name === 'changeLanguage') {
          setLanguageSelectorVisibility(true);
          return;
        }

        onCopyAsSubmit();
      }}
      icon="copyClipboard"
    >
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <FormattedMessage
                tagName="span"
                id="console.requestOptions.copyAsUrlButtonLabel"
                defaultMessage="Copy as"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <strong>{currentLanguage}</strong>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isRequestConverterLoading ? (
            <EuiLoadingSpinner size="s" />
          ) : (
            // The EuiContextMenuItem renders itself as a button already, so we need to
            // force the link to not be a button in order to prevent A11Y issues.
            <EuiLink href="" data-name="changeLanguage" data-test-subj="changeLanguageButton">
              Change
            </EuiLink>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      data-test-subj="consoleMenuAutoIndent"
      key="Auto indent"
      onClick={handleAutoIndent}
      icon="kqlFunction"
    >
      <FormattedMessage
        id="console.requestOptions.autoIndentButtonLabel"
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
        id="console.requestOptions.openDocumentationButtonLabel"
        defaultMessage="Open API reference"
      />
    </EuiContextMenuItem>,
  ];

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
        <EuiContextMenuPanel items={items} data-test-subj="consoleMenu" />
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
