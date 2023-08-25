/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiSpacer, EuiCallOut, EuiText, EuiPanelProps } from '@elastic/eui';
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
      />
      <EuiSpacer />
      <Link language={language} assetBasePath={assetBasePath} />
      <EuiSpacer />
      <EuiCallOut
        iconType="iInCircle"
        title={i18n.translate('searchApiPanels.welcomeBanner.apiCallOut.title', {
          defaultMessage: 'Call the API with Console',
        })}
        color="primary"
      >
        <EuiText size="s">
          {i18n.translate('searchApiPanels.welcomeBanner.apiCallout.content', {
            defaultMessage:
              'Console enables you to call Elasticsearch and Kibana REST APIs directly, without needing to install a language client.',
          })}
        </EuiText>
      </EuiCallOut>
    </>
  );
  return (
    <OverviewPanel
      description={i18n.translate('searchApiPanels.welcomeBanner.installClient.description', {
        defaultMessage:
          'Elastic builds and maintains clients in several popular languages and our community has contributed many more. Install your favorite language client to get started.',
      })}
      links={[
        {
          href: language.docLink,
          label: i18n.translate('searchApiPanels.welcomeBanner.installClient.clientDocLink', {
            defaultMessage: '{languageName} client documentation',
            values: { languageName: language.name },
          }),
        },
      ]}
      title={i18n.translate('searchApiPanels.welcomeBanner.installClient.title', {
        defaultMessage: 'Install a client',
      })}
      leftPanelContent={isPanelLeft ? panelContent : undefined}
      rightPanelContent={!isPanelLeft ? panelContent : undefined}
      overviewPanelProps={overviewPanelProps}
    />
  );
};
