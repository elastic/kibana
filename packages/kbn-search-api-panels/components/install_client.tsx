/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiSpacer, EuiPanelProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { CodeBox } from './code_box';
import { OverviewPanel } from './overview_panel';
import { LanguageDefinition } from '../types';
import { GithubLink } from './github_link';

interface InstallClientProps {
  codeSnippet: string;
  consoleRequest?: string;
  language: LanguageDefinition;
  setSelectedLanguage: (language: LanguageDefinition) => void;
  assetBasePath: string;
  application?: ApplicationStart;
  sharePlugin: SharePluginStart;
  isPanelLeft?: boolean;
  languages: LanguageDefinition[];
  overviewPanelProps?: Partial<EuiPanelProps>;
}

const Link: React.FC<{ language: LanguageDefinition; assetBasePath: string }> = ({
  language,
  assetBasePath,
}) => {
  if (language.github) {
    return (
      <GithubLink
        href={language.github.link}
        label={language.github.label}
        assetBasePath={assetBasePath}
      />
    );
  }
  return null;
};

export const InstallClientPanel: React.FC<InstallClientProps> = ({
  codeSnippet,
  consoleRequest,
  language,
  languages,
  setSelectedLanguage,
  assetBasePath,
  application,
  sharePlugin,
  isPanelLeft = true,
  overviewPanelProps,
}) => {
  const panelContent = (
    <>
      <CodeBox
        consoleRequest={consoleRequest}
        codeSnippet={codeSnippet}
        languageType="shell"
        languages={languages}
        selectedLanguage={language}
        setSelectedLanguage={setSelectedLanguage}
        assetBasePath={assetBasePath}
        application={application}
        sharePlugin={sharePlugin}
        consoleTitle={i18n.translate('searchApiPanels.welcomeBanner.installClient.title', {
          defaultMessage: 'Install a client',
        })}
      />
      <EuiSpacer />
      <Link language={language} assetBasePath={assetBasePath} />
    </>
  );
  return (
    <OverviewPanel
      description={i18n.translate('searchApiPanels.welcomeBanner.installClient.description', {
        defaultMessage: 'First you need to install your programming language client of choice.',
      })}
      links={
        language.docLink
          ? [
              {
                href: language.docLink,
                label: i18n.translate('searchApiPanels.welcomeBanner.installClient.clientDocLink', {
                  defaultMessage: '{languageName} client documentation',
                  values: { languageName: language.name },
                }),
              },
            ]
          : []
      }
      title={i18n.translate('searchApiPanels.welcomeBanner.installClient.title', {
        defaultMessage: 'Install a client',
      })}
      leftPanelContent={isPanelLeft ? panelContent : undefined}
      rightPanelContent={!isPanelLeft ? panelContent : undefined}
      overviewPanelProps={overviewPanelProps}
    />
  );
};
