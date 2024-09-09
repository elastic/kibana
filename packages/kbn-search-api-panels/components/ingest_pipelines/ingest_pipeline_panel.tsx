/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiBadge,
  EuiSuperSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IngestGetPipelineResponse } from '@elastic/elasticsearch/lib/api/types';
import { createIngestPipelineOptions } from './ingest_pipeline_options';

interface IngestPipelinePanelProps {
  selectedPipeline: string;
  setSelectedPipeline: (pipeline: string) => void;
  ingestPipelinesData?: IngestGetPipelineResponse;
  defaultIngestPipeline: string;
}

export const IngestPipelinePanel: React.FC<IngestPipelinePanelProps> = ({
  selectedPipeline,
  setSelectedPipeline,
  ingestPipelinesData,
  defaultIngestPipeline,
}) => {
  const options = useMemo(
    () => createIngestPipelineOptions(ingestPipelinesData, defaultIngestPipeline),
    [ingestPipelinesData, defaultIngestPipeline]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="s" data-test-subj="ingestPipelinePanelTitle">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <strong>
              {i18n.translate('searchApiPanels.welcomeBanner.ingestPipelinePanel.title', {
                defaultMessage: 'Preprocess your data',
              })}
            </strong>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge>
            {i18n.translate('searchApiPanels.welcomeBanner.ingestPipelinePanel.optionalBadge', {
              defaultMessage: 'Optional',
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText data-test-subj="ingestPipelinePanelBody">
        <p>
          {i18n.translate('searchApiPanels.welcomeBanner.ingestPipelinePanel.description', {
            defaultMessage:
              'You can use ingest pipelines to preprocess data before indexing into Elasticsearch.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiSuperSelect
        options={options}
        valueOfSelected={selectedPipeline}
        placeholder={i18n.translate(
          'searchApiPanels.welcomeBanner.ingestPipelinePanel.selectPipelinePlaceholder',
          {
            defaultMessage: 'Select a pipeline',
          }
        )}
        onChange={setSelectedPipeline}
        itemLayoutAlign="top"
        hasDividers
        data-test-subj="ingestPipelinePanelSelect"
      />
      <EuiSpacer size="m" />
    </>
  );
};
