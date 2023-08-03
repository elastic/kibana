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
import type { HttpStart } from '@kbn/core-http-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';

import { consoleDefinition } from '../languages/console';
import { LanguageDefinition, LanguageDefinitionSnippetArguments } from '../languages/types';
import { TryInConsoleButton } from './try_in_console_button';
import './code_box.scss';

interface CodeBoxProps {
  languages: LanguageDefinition[];
  code: keyof LanguageDefinition;
  codeArgs: LanguageDefinitionSnippetArguments;
  // overrides the language type for syntax highlighting
  languageType?: string;
  selectedLanguage: LanguageDefinition;
  setSelectedLanguage: (language: LanguageDefinition) => void;
  http: HttpStart;
  pluginId: string;
  application?: ApplicationStart;
  sharePlugin: SharePluginStart;
}

const getCodeSnippet = (
  language: Partial<LanguageDefinition>,
  key: keyof LanguageDefinition,
  args: LanguageDefinitionSnippetArguments
): string => {
  const snippetVal = language[key];
  if (snippetVal === undefined) return '';
  if (typeof snippetVal === 'string') return snippetVal;
  return snippetVal(args);
};

export const CodeBox: React.FC<CodeBoxProps> = ({
  code,
  codeArgs,
  languages,
  languageType,
  selectedLanguage,
  setSelectedLanguage,
  http,
  pluginId,
  application,
  sharePlugin,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const items = languages.map((language) => (
    <EuiContextMenuItem
      key={language.id}
      icon={http.basePath.prepend(`/plugins/${pluginId}/assets/${language.iconType}`)}
      onClick={() => {
        setSelectedLanguage(language);
        setIsPopoverOpen(false);
      }}
    >
      {language.name}
    </EuiContextMenuItem>
  ));

  const button = (
    <EuiThemeProvider colorMode="dark">
      <EuiButtonEmpty
        aria-label={i18n.translate('xpack.serverlessSearch.codeBox.selectAriaLabel', {
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
  );
  const codeSnippet = getCodeSnippet(selectedLanguage, code, codeArgs);
  const showTryInConsole = code in consoleDefinition;

  return (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel paddingSize="xs" className="serverlessSearchCodeBlockControlsPanel">
        <EuiFlexGroup alignItems="center">
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
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={codeSnippet}>
              {(copy) => (
                <EuiButtonEmpty color="text" iconType="copy" size="s" onClick={copy}>
                  {i18n.translate('xpack.serverlessSearch.codeBox.copyButtonLabel', {
                    defaultMessage: 'Copy',
                  })}
                </EuiButtonEmpty>
              )}
            </EuiCopy>
          </EuiFlexItem>
          {showTryInConsole && (
            <EuiFlexItem grow={false}>
              <TryInConsoleButton
                request={getCodeSnippet(consoleDefinition, code, codeArgs)}
                application={application}
                sharePlugin={sharePlugin}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiHorizontalRule margin="none" />
        <EuiCodeBlock
          transparentBackground
          fontSize="m"
          language={languageType || selectedLanguage.languageStyling || selectedLanguage.id}
        >
          {codeSnippet}
        </EuiCodeBlock>
      </EuiPanel>
    </EuiThemeProvider>
  );
};
