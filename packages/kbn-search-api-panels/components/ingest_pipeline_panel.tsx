/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, Fragment, useMemo } from 'react';

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
import { IngestGetPipelineResponse, IngestPipeline } from '@elastic/elasticsearch/lib/api/types';

import { DEFAULT_INGESTION_PIPELINE } from '../constants';

interface OptionItem {
  value: string;
  inputDisplay: string;
  dropdownDisplay: JSX.Element;
}

interface IngestPipelinePanelProps {
  setSelectedPipeline: (pipeline: string) => void;
  ingestPipelinesData?: IngestGetPipelineResponse;
}

interface IngestPipelineWithDeprecated extends IngestPipeline {
  deprecated?: boolean;
}

export const IngestPipelinePanel: React.FC<IngestPipelinePanelProps> = ({
  setSelectedPipeline,
  ingestPipelinesData,
}) => {
  const createProcessorCount = (item: IngestPipelineWithDeprecated | undefined) => (
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('searchApiPanels.welcomeBanner.ingestPipelinePanel.processorCount', {
            defaultMessage: '{count} {count, plural, one {processor} other {processors}}',
            values: { count: item?.processors?.length },
          })}
        </p>
      </EuiText>
    </EuiFlexItem>
  );

  const createManagedBadge = (item: IngestPipelineWithDeprecated | undefined) =>
    item?._meta?.managed && (
      <EuiFlexItem grow={false}>
        <EuiBadge>
          {i18n.translate('searchApiPanels.welcomeBanner.ingestPipelinePanel.managedBadge', {
            defaultMessage: 'Managed',
          })}
        </EuiBadge>
      </EuiFlexItem>
    );

  const createRecommendedBadge = (pipelineName: string) =>
    pipelineName === DEFAULT_INGESTION_PIPELINE && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="primary">
          {i18n.translate('searchApiPanels.welcomeBanner.ingestPipelinePanel.recommendedBadge', {
            defaultMessage: 'Recommended',
          })}
        </EuiBadge>
      </EuiFlexItem>
    );

  const options = useMemo(() => {
    const createOptionItem = (pipelineName: string): OptionItem => {
      const item: IngestPipelineWithDeprecated | undefined = ingestPipelinesData?.[pipelineName];
      return {
        value: pipelineName,
        inputDisplay: pipelineName,
        dropdownDisplay: (
          <Fragment>
            <strong>{pipelineName}</strong>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              data-test-subj="ingestPipelinePanelProcessors"
            >
              {createProcessorCount(item)}
              {createManagedBadge(item)}
              {createRecommendedBadge(pipelineName)}
            </EuiFlexGroup>
          </Fragment>
        ),
      };
    };

    return ingestPipelinesData
      ? Object.keys(ingestPipelinesData)
          .filter(
            (pipelineName: string) =>
              !(ingestPipelinesData[pipelineName] as IngestPipelineWithDeprecated)?.deprecated
          )
          .map(createOptionItem)
      : [];
  }, [ingestPipelinesData]);

  const [selected, setSelected] = useState<string>();

  const onChange = (value: string) => {
    setSelected(value);
    setSelectedPipeline(value);
  };

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
        valueOfSelected={selected}
        placeholder={i18n.translate(
          'searchApiPanels.welcomeBanner.ingestPipelinePanel.selectPipelinePlaceholder',
          {
            defaultMessage: 'Select a pipeline',
          }
        )}
        onChange={(value) => onChange(value)}
        itemLayoutAlign="top"
        hasDividers
        data-test-subj="ingestPipelinePanelSelect"
      />
      <EuiSpacer size="m" />
    </>
  );
};
