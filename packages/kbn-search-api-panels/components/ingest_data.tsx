/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { IngestGetPipelineResponse } from '@elastic/elasticsearch/lib/api/types';
import { IngestPipelinePanel } from './ingest_pipelines/ingest_pipeline_panel';
import { CodeBox } from './code_box';
import { LanguageDefinition } from '../types';
import { OverviewPanel } from './overview_panel';
import { IngestionsPanel } from './ingestions_panel';
interface IngestDataProps {
  codeSnippet: string;
  selectedLanguage: LanguageDefinition;
  setSelectedLanguage: (language: LanguageDefinition) => void;
  docLinks: {
    beats: string;
    logstash: string;
  };
  assetBasePath: string;
  application?: ApplicationStart;
  consolePlugin?: ConsolePluginStart;
  sharePlugin: SharePluginStart;
  languages: LanguageDefinition[];
  consoleRequest?: string;
  additionalIngestionPanel?: React.ReactNode;
  ingestPipelineData?: IngestGetPipelineResponse;
  selectedPipeline: string;
  setSelectedPipeline: (pipelineId: string) => void;
  defaultIngestPipeline: string;
}

export const IngestData: React.FC<IngestDataProps> = ({
  codeSnippet,
  selectedLanguage,
  selectedPipeline,
  setSelectedLanguage,
  docLinks,
  assetBasePath,
  application,
  consolePlugin,
  sharePlugin,
  languages,
  consoleRequest,
  additionalIngestionPanel,
  ingestPipelineData,
  setSelectedPipeline,
  defaultIngestPipeline,
}) => {
  return (
    <OverviewPanel
      description={i18n.translate('searchApiPanels.welcomeBanner.ingestData.description', {
        defaultMessage: 'Add data to your data stream or index to make it searchable via API. ',
      })}
      leftPanelContent={
        <CodeBox
          consoleRequest={consoleRequest}
          codeSnippet={codeSnippet}
          languages={languages}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          assetBasePath={assetBasePath}
          application={application}
          consolePlugin={consolePlugin}
          sharePlugin={sharePlugin}
          consoleTitle={i18n.translate('searchApiPanels.welcomeBanner.ingestData.title', {
            defaultMessage: 'Ingest data',
          })}
        />
      }
      links={[]}
      title={i18n.translate('searchApiPanels.welcomeBanner.ingestData.title', {
        defaultMessage: 'Ingest data',
      })}
    >
      <EuiSpacer size="l" />
      <IngestPipelinePanel
        selectedPipeline={selectedPipeline}
        setSelectedPipeline={setSelectedPipeline}
        ingestPipelinesData={ingestPipelineData}
        defaultIngestPipeline={defaultIngestPipeline}
      />
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('searchApiPanels.welcomeBanner.ingestData.alternativeOptions', {
            defaultMessage: 'Alternative ingestion options',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />

      <IngestionsPanel
        assetBasePath={assetBasePath}
        docLinks={docLinks}
        additionalIngestionPanel={additionalIngestionPanel}
      />
    </OverviewPanel>
  );
};
