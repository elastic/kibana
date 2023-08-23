/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import { EuiCheckableCard, EuiFormFieldset, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { CodeBox } from './code_box';
import { LanguageDefinition } from '../types';
import { OverviewPanel } from './overview_panel';
import { IntegrationsPanel } from './integrations_panel';

interface IngestDataProps {
  codeSnippet: string;
  selectedLanguage: LanguageDefinition;
  setSelectedLanguage: (language: LanguageDefinition) => void;
  docLinks: any;
  http: HttpStart;
  pluginId: string;
  application?: ApplicationStart;
  sharePlugin: SharePluginStart;
  languages: LanguageDefinition[];
  showTryInConsole: boolean;
}

export const IngestData: React.FC<IngestDataProps> = ({
  codeSnippet,
  selectedLanguage,
  setSelectedLanguage,
  docLinks,
  http,
  pluginId,
  application,
  sharePlugin,
  languages,
  showTryInConsole,
}) => {
  const [selectedIngestMethod, setSelectedIngestMethod] = useState<
    'ingestViaApi' | 'ingestViaIntegration'
  >('ingestViaApi');
  return (
    <OverviewPanel
      description={i18n.translate('searchApiPanels.welcomeBanner.ingestData.description', {
        defaultMessage:
          'Add data to your data stream or index to make it searchable. Choose an ingestion method that fits your application and workflow.',
      })}
      leftPanelContent={
        selectedIngestMethod === 'ingestViaApi' ? (
          <CodeBox
            showTryInConsole={showTryInConsole}
            codeSnippet={codeSnippet}
            languages={languages}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            http={http}
            pluginId={pluginId}
            application={application}
            sharePlugin={sharePlugin}
          />
        ) : (
          <IntegrationsPanel docLinks={docLinks} http={http} pluginId={pluginId} />
        )
      }
      links={[
        ...(selectedLanguage.apiReference
          ? [
              {
                href: selectedLanguage.apiReference,
                label: i18n.translate('searchApiPanels.welcomeBanner.ingestData.clientDocLink', {
                  defaultMessage: '{languageName} API reference',
                  values: { languageName: selectedLanguage.name },
                }),
              },
            ]
          : []),
        {
          href: docLinks.integrations,
          label: i18n.translate('searchApiPanels.welcomeBanner.ingestData.integrationsLink', {
            defaultMessage: 'About Integrations',
          }),
        },
      ]}
      title={i18n.translate('searchApiPanels.welcomeBanner.ingestData.title', {
        defaultMessage: 'Ingest data',
      })}
    >
      <EuiFormFieldset
        legend={{
          children: i18n.translate('searchApiPanels.welcomeBanner.ingestData.ingestLegendLabel', {
            defaultMessage: 'Select an ingestion method',
          }),
          display: 'hidden',
        }}
      >
        <EuiCheckableCard
          hasShadow
          id="ingestViaApi"
          label={
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('searchApiPanels.welcomeBanner.ingestData.ingestApiLabel', {
                  defaultMessage: 'Ingest via API',
                })}
              </h3>
            </EuiTitle>
          }
          value="ingestViaApi"
          checked={selectedIngestMethod === 'ingestViaApi'}
          onChange={() => setSelectedIngestMethod('ingestViaApi')}
        >
          <EuiText>
            {i18n.translate('searchApiPanels.welcomeBanner.ingestData.ingestApiDescription', {
              defaultMessage:
                'The most flexible way to index data, enabling full control over your customization and optimization options.',
            })}
          </EuiText>
        </EuiCheckableCard>
        <EuiSpacer />
        <EuiCheckableCard
          hasShadow
          id="ingestViaIntegration"
          label={
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('searchApiPanels.welcomeBanner.ingestData.ingestIntegrationLabel', {
                  defaultMessage: 'Ingest via integration',
                })}
              </h3>
            </EuiTitle>
          }
          value="ingestViaIntegration"
          checked={selectedIngestMethod === 'ingestViaIntegration'}
          onChange={() => setSelectedIngestMethod('ingestViaIntegration')}
        >
          <EuiText>
            {i18n.translate(
              'searchApiPanels.welcomeBanner.ingestData.ingestIntegrationDescription',
              {
                defaultMessage:
                  'Specialized ingestion tools optimized for transforming data and shipping it to Elasticsearch.',
              }
            )}
          </EuiText>
        </EuiCheckableCard>
      </EuiFormFieldset>
    </OverviewPanel>
  );
};
