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
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { TryInConsoleButton } from '@kbn/try-in-console';

import type { LanguageDefinition } from '../types';

interface CodeBoxProps {
  languages?: LanguageDefinition[];
  codeSnippet: string;
  // overrides the language type for syntax highlighting
  languageType?: string;
  selectedLanguage?: LanguageDefinition;
  setSelectedLanguage?: (language: LanguageDefinition) => void;
  assetBasePath?: string;
  application?: ApplicationStart;
  consolePlugin?: ConsolePluginStart;
  sharePlugin?: SharePluginStart;
  consoleRequest?: string;
  showTopBar?: boolean;
  consoleTitle?: string;
}

export const CodeBox: React.FC<CodeBoxProps> = ({
  application,
  codeSnippet,
  consolePlugin,
  languageType,
  languages,
  assetBasePath,
  selectedLanguage,
  setSelectedLanguage,
  sharePlugin,
  consoleRequest,
  consoleTitle,
  showTopBar = true,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const selectLanguageDescription = consoleTitle
    ? i18n.translate('searchApiPanels.welcomeBanner.codeBox.selectAriaLabel', {
        defaultMessage: '{context}',
        values: { context: consoleTitle },
      })
    : i18n.translate('searchApiPanels.welcomeBanner.codeBox.selectLabel', {
        defaultMessage: 'Select a programming language for the code snippet',
      });

  const getCopyButtonAriaLabel = consoleTitle
    ? i18n.translate('searchApiPanels.welcomeBanner.codeBox.copyAriaLabel', {
        defaultMessage: 'Copy the {context} code snippet',
        values: { context: consoleTitle },
      })
    : i18n.translate('searchApiPanels.welcomeBanner.codeBox.copyLabel', {
        defaultMessage: 'Copy the code snippet',
      });

  const items = languages
    ? languages.map((language) => (
        <EuiContextMenuItem
          key={language.id}
          icon={`${assetBasePath}/${language.iconType}`}
          aria-label={i18n.translate(
            'searchApiPanels.welcomeBanner.codeBox.selectChangeAriaLabel',
            {
              defaultMessage: 'Change language to {languageName} for every instance on this page',
              values: { languageName: language.name },
            }
          )}
          onClick={() => {
            if (setSelectedLanguage) {
              setSelectedLanguage(language);
              setIsPopoverOpen(false);
            }
          }}
        >
          {language.name}
        </EuiContextMenuItem>
      ))
    : [];

  const button = selectedLanguage ? (
    <EuiButtonEmpty
      color="text"
      iconType="chevronSingleDown"
      iconSide="right"
      size="s"
      aria-label={selectLanguageDescription}
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
    >
      {selectedLanguage.name}
    </EuiButtonEmpty>
  ) : null;

  return (
    <EuiPanel paddingSize="xs" data-test-subj="codeBlockControlsPanel" hasBorder>
      {showTopBar && (
        <EuiFlexGroup
          alignItems="center"
          responsive={false}
          gutterSize="s"
          justifyContent={languages && languages.length !== 0 ? 'spaceBetween' : 'flexEnd'}
        >
          {languages && button && (
            <EuiFlexItem grow={false}>
              <EuiPopover
                aria-label={selectLanguageDescription}
                button={button}
                isOpen={isPopoverOpen}
                closePopover={() => setIsPopoverOpen(false)}
                panelPaddingSize="none"
                anchorPosition="downLeft"
              >
                <EuiContextMenuPanel items={items} />
              </EuiPopover>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={codeSnippet}>
                  {(copy) => (
                    <EuiButtonEmpty
                      color="text"
                      iconType="copy"
                      size="s"
                      onClick={copy}
                      aria-label={getCopyButtonAriaLabel}
                    >
                      {i18n.translate('searchApiPanels.welcomeBanner.codeBox.copyButtonLabel', {
                        defaultMessage: 'Copy',
                      })}
                    </EuiButtonEmpty>
                  )}
                </EuiCopy>
              </EuiFlexItem>
              {consoleRequest !== undefined && sharePlugin && (
                <EuiFlexItem grow={false}>
                  <TryInConsoleButton
                    request={consoleRequest}
                    application={application}
                    consolePlugin={consolePlugin}
                    sharePlugin={sharePlugin}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiCodeBlock
        isCopyable={!showTopBar}
        transparentBackground
        fontSize="s"
        paddingSize="m"
        language={languageType || selectedLanguage?.languageStyling || selectedLanguage?.id}
        overflowHeight={500}
      >
        {codeSnippet}
      </EuiCodeBlock>
    </EuiPanel>
  );
};
