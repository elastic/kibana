/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  EuiHorizontalRule,
  EuiPanel,
  EuiPopover,
  EuiThemeProvider,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { TryInConsoleButton } from '@kbn/try-in-console';

import { LanguageDefinition } from '../types';
import './code_box.scss';

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
  showTopBar = true,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const items = languages
    ? languages.map((language) => (
        <EuiContextMenuItem
          key={language.id}
          icon={`${assetBasePath}/${language.iconType}`}
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
    <EuiThemeProvider colorMode="dark">
      <EuiButtonEmpty
        aria-label={i18n.translate('searchApiPanels.welcomeBanner.codeBox.selectAriaLabel', {
          defaultMessage: 'Select a programming language',
        })}
        color="text"
        iconType="arrowDown"
        iconSide="left"
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      >
        {selectedLanguage.name}
      </EuiButtonEmpty>
    </EuiThemeProvider>
  ) : null;

  return (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel paddingSize="xs" className="codeBoxPanel" data-test-subj="codeBlockControlsPanel">
        {showTopBar && (
          <>
            <EuiFlexGroup
              alignItems="center"
              responsive={false}
              gutterSize="s"
              justifyContent={languages && languages.length !== 0 ? 'spaceBetween' : 'flexEnd'}
            >
              {languages && button && (
                <EuiFlexItem>
                  <EuiThemeProvider colorMode="light">
                    <EuiPopover
                      button={button}
                      isOpen={isPopoverOpen}
                      closePopover={() => setIsPopoverOpen(false)}
                      panelPaddingSize="none"
                      anchorPosition="downLeft"
                    >
                      <EuiContextMenuPanel items={items} size="s" />
                    </EuiPopover>
                  </EuiThemeProvider>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={codeSnippet}>
                  {(copy) => (
                    <EuiButtonEmpty color="text" iconType="copyClipboard" size="s" onClick={copy}>
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
            <EuiHorizontalRule margin="none" />
          </>
        )}
        <EuiCodeBlock
          isCopyable={!showTopBar}
          transparentBackground
          fontSize="m"
          language={languageType || selectedLanguage?.languageStyling || selectedLanguage?.id}
          overflowHeight={500}
          className="codeBoxCodeBlock"
        >
          {codeSnippet}
        </EuiCodeBlock>
      </EuiPanel>
    </EuiThemeProvider>
  );
};
