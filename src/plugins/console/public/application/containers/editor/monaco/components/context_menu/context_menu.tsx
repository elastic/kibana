/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { NotificationsSetup } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { LanguageSelectorModal } from './language_selector_modal';
import { i18n } from '@kbn/i18n';

interface Props {
  getCurl: () => Promise<string>;
  getDocumentation: () => Promise<string | null>;
  autoIndent: (ev: React.MouseEvent) => void;
  notifications: NotificationsSetup;
}

export const ContextMenu = ({ getCurl, getDocumentation, autoIndent, notifications }: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isLanguageSelectorVisible, setLanguageSelectorVisibility] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('cURL');
  const [curlCode, setCurlCode] = useState('');
  const [curlError, setCurlError] = useState(null);

  const mouseEnter = useCallback(() => {
    if (isPopoverOpen) return;
    getCurl()
      .then((text) => {
        setCurlCode(text);
        setCurlError(null);
      })
      .catch((e) => {
        setCurlError(e);
      });
  }, [isPopoverOpen, getCurl]);

  const copyText = async (text: string) => {
    if (curlError) {
      throw curlError;
    }
    if (window.navigator?.clipboard) {
      await window.navigator.clipboard.writeText(text);
      return;
    }
    throw new Error('Could not copy to clipboard!');
  };

  const copyAsCurl = async () => {
    try {
      await copyText(curlCode);
      notifications.toasts.add({
        title: i18n.translate('console.consoleMenu.copyAsCurlMessage', {
          defaultMessage: 'Request copied as cURL',
        }),
      });
    } catch (e) {
      notifications.toasts.addError(e, {
        title: i18n.translate('console.consoleMenu.copyAsCurlFailedMessage', {
          defaultMessage: 'Could not copy request as cURL',
        }),
      });
    }
  };

  const changeDefaultLanguage = (language: string) => {
    setCurrentLanguage(language);
  };

  const onButtonClick = () => {
    setIsPopoverOpen((prev) => !prev);
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
      onClick={onButtonClick}
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
      key="Copy as cURL"
      data-test-subj="consoleMenuCopyAsCurl"
      id="ConCopyAsCurl"
      disabled={!window.navigator?.clipboard}
      onClick={(e: React.MouseEvent) => {
        const target = e.target as HTMLButtonElement;

        if (target.dataset.name === 'changeLanguage') {
          setLanguageSelectorVisibility(true);
          return;
        }

        closePopover();
        copyAsCurl();
      }}
      icon="copyClipboard"
    >
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize='s' alignItems="center">
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
            <EuiLink data-name="changeLanguage">
              Change
            </EuiLink>
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
      <span onMouseEnter={mouseEnter}>
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
      </span>
      {isLanguageSelectorVisible && (
        <LanguageSelectorModal
          currentLanguage={currentLanguage}
          changeDefaultLanguage={changeDefaultLanguage}
          closeModal={() => setLanguageSelectorVisibility(false)}
          hidePopover={() => setIsPopoverOpen(false)}
        />
      )}
    </>
  );
};
