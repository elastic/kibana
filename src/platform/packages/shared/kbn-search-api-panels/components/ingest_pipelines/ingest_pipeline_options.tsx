/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import { EuiFlexItem, EuiText, EuiBadge, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import { IngestGetPipelineResponse } from '@elastic/elasticsearch/lib/api/types';

interface OptionItem {
  value: string;
  inputDisplay: string;
  dropdownDisplay: JSX.Element;
}

export interface IngestPipelineWithDeprecated extends IngestPipeline {
  deprecated?: boolean;
}

const ProcessorCount = ({ item }: { item: IngestPipelineWithDeprecated | undefined }) => (
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

const ManagedBadge = ({ item }: { item: IngestPipelineWithDeprecated | undefined }) => {
  if (!item?._meta?.managed) return null;
  return (
    <EuiFlexItem grow={false}>
      <EuiBadge>
        {i18n.translate('searchApiPanels.welcomeBanner.ingestPipelinePanel.managedBadge', {
          defaultMessage: 'Managed',
        })}
      </EuiBadge>
    </EuiFlexItem>
  );
};

const RecommendedBadge = ({
  pipelineName,
  defaultIngestPipeline,
}: {
  pipelineName: string;
  defaultIngestPipeline: string;
}) => {
  if (pipelineName !== defaultIngestPipeline) return null;
  return (
    <EuiFlexItem grow={false}>
      <EuiBadge color="primary">
        {i18n.translate('searchApiPanels.welcomeBanner.ingestPipelinePanel.recommendedBadge', {
          defaultMessage: 'Recommended',
        })}
      </EuiBadge>
    </EuiFlexItem>
  );
};

const createOptionItem = (
  pipelineName: string,
  item: IngestPipelineWithDeprecated | undefined,
  defaultIngestPipeline: string
): OptionItem => {
  return {
    value: pipelineName,
    inputDisplay: pipelineName,
    dropdownDisplay: (
      <Fragment>
        <strong data-test-subj="ingestPipelinePanelOptionTitle">{pipelineName}</strong>
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          data-test-subj="ingestPipelinePanelOptions"
        >
          <ProcessorCount item={item} />
          <ManagedBadge item={item} />
          <RecommendedBadge
            pipelineName={pipelineName}
            defaultIngestPipeline={defaultIngestPipeline}
          />
        </EuiFlexGroup>
      </Fragment>
    ),
  };
};

export const createIngestPipelineOptions = (
  ingestPipelinesData: IngestGetPipelineResponse | undefined,
  defaultIngestPipeline: string
) => {
  if (!ingestPipelinesData) return [];

  let options = Object.keys(ingestPipelinesData)
    .filter(
      (pipelineName: string) =>
        !(ingestPipelinesData[pipelineName] as IngestPipelineWithDeprecated)?.deprecated
    )
    .map((pipelineName) =>
      createOptionItem(pipelineName, ingestPipelinesData[pipelineName], defaultIngestPipeline)
    );

  if (ingestPipelinesData[defaultIngestPipeline]) {
    const defaultOption = createOptionItem(
      defaultIngestPipeline,
      ingestPipelinesData[defaultIngestPipeline],
      defaultIngestPipeline
    );
    options = [
      defaultOption,
      ...options.filter((option) => option.value !== defaultIngestPipeline),
    ];
  }

  return options;
};
