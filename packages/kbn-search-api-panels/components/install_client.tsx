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
import type { HttpStart } from '@kbn/core-http-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { CodeBox } from './code_box';
import { OverviewPanel } from './overview_panel';
import { LanguageDefinition, Languages } from '../types';
import { GithubLink } from './github_link';

interface InstallClientProps {
  codeSnippet: string;
  showTryInConsole: boolean;
  language: LanguageDefinition;
  setSelectedLanguage: (language: LanguageDefinition) => void;
  http: HttpStart;
  pluginId: string;
  application?: ApplicationStart;
  sharePlugin: SharePluginStart;
  isPanelLeft?: boolean;
  languages: LanguageDefinition[];
  overviewPanelProps?: Partial<EuiPanelProps>;
}

const Link: React.FC<{ language: Languages; http: HttpStart; pluginId: string }> = ({
  language,
  http,
  pluginId,
}) => {
  switch (language) {
    case Languages.CURL:
      return (
        <GithubLink
          href="https://github.com/curl/curl"
          label={i18n.translate('searchApiPanels.welcomeBanner.githubLink.curl.label', {
            defaultMessage: 'curl',
          })}
          http={http}
          pluginId={pluginId}
        />
      );
    case Languages.JAVASCRIPT:
      return (
        <GithubLink
          href="https://github.com/elastic/elasticsearch-js"
          label={i18n.translate('searchApiPanels.welcomeBanner.githubLink.javascript.label', {
            defaultMessage: 'elasticsearch',
          })}
          http={http}
          pluginId={pluginId}
        />
      );
    case Languages.RUBY:
      return (
        <GithubLink
          href="https://github.com/elastic/elasticsearch-ruby"
          label={i18n.translate('searchApiPanels.welcomeBanner.githubLink.ruby.label', {
            defaultMessage: 'elasticsearch-ruby',
          })}
          http={http}
          pluginId={pluginId}
        />
      );
  }
  return null;
};

export const InstallClientPanel: React.FC<InstallClientProps> = ({
  codeSnippet,
  showTryInConsole,
  language,
  languages,
  setSelectedLanguage,
  http,
  pluginId,
  application,
  sharePlugin,
  isPanelLeft = true,
  overviewPanelProps,
}) => {
  const panelContent = (
    <>
      <CodeBox
        showTryInConsole={showTryInConsole}
        codeSnippet={codeSnippet}
        languageType="shell"
        languages={languages}
        selectedLanguage={language}
        setSelectedLanguage={setSelectedLanguage}
        http={http}
        pluginId={pluginId}
        application={application}
        sharePlugin={sharePlugin}
      />
      <EuiSpacer />
      <Link language={language.id} http={http} pluginId={pluginId} />
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
