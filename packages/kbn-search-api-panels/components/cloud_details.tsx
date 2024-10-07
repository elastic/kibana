/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiCheckableCard,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiThemeProvider,
  EuiTitle,
  EuiBadge,
  EuiPanelProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { OverviewPanel } from '..';
import { ELASTICSEARCH_URL_PLACEHOLDER } from '../constants';

export interface CloudDetailsPanelProps {
  cloudId?: string;
  elasticsearchUrl?: string;
  isPanelLeft?: boolean;
  overviewPanelProps?: Partial<EuiPanelProps>;
}

enum CloudDetail {
  ElasticsearchEndpoint = 'es_url',
  CloudId = 'cloud_id',
}

export const CloudDetailsPanel = ({
  cloudId,
  elasticsearchUrl = ELASTICSEARCH_URL_PLACEHOLDER,
  isPanelLeft = true,
  overviewPanelProps,
}: CloudDetailsPanelProps) => {
  const [selectedDetail, setSelectedCloudDetail] = useState<CloudDetail>(
    CloudDetail.ElasticsearchEndpoint
  );
  const panelContent = (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel paddingSize="xs">
        <EuiCodeBlock
          css={css`
            overflow-wrap: anywhere;
          `}
          isCopyable
          fontSize="m"
          className="serverlessSearchCloudDetailsCopyPanel"
          whiteSpace="pre-wrap"
        >
          {selectedDetail === CloudDetail.CloudId && cloudId}
          {selectedDetail === CloudDetail.ElasticsearchEndpoint && elasticsearchUrl}
        </EuiCodeBlock>
      </EuiPanel>
    </EuiThemeProvider>
  );
  return (
    <OverviewPanel
      description={i18n.translate('searchApiPanels.cloudIdDetails.description', {
        defaultMessage: 'Get ready to ingest and query your data by choosing a connection option:',
      })}
      leftPanelContent={isPanelLeft ? panelContent : undefined}
      rightPanelContent={isPanelLeft ? undefined : panelContent}
      links={[]}
      title={i18n.translate('searchApiPanels.cloudIdDetails.title', {
        defaultMessage: 'Copy your connection details',
      })}
      overviewPanelProps={overviewPanelProps}
    >
      <EuiSpacer size="l" />
      <EuiCheckableCard
        id={CloudDetail.ElasticsearchEndpoint}
        name={CloudDetail.ElasticsearchEndpoint}
        label={
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="searchApiPanels.cloudIdDetails.elasticsearchEndpoint.title"
                    defaultMessage="Elasticsearch endpoint"
                  />
                </h5>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span>
                <EuiBadge color="success">
                  <FormattedMessage
                    id="searchApiPanels.cloudIdDetails.elasticsearchEndpoint.recommendedBadge"
                    defaultMessage="Recommended"
                  />
                </EuiBadge>
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        checked={selectedDetail === CloudDetail.ElasticsearchEndpoint}
        onChange={() => setSelectedCloudDetail(CloudDetail.ElasticsearchEndpoint)}
      >
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="searchApiPanels.cloudIdDetails.elasticsearchEndpoint.description"
              defaultMessage="The most common method for establishing an Elasticsearch connection."
            />
          </p>
        </EuiText>
      </EuiCheckableCard>
      <EuiSpacer />
      {Boolean(cloudId) && (
        <EuiCheckableCard
          id={CloudDetail.CloudId}
          name={CloudDetail.CloudId}
          label={
            <EuiTitle size="xxs">
              <h5>
                <FormattedMessage
                  id="searchApiPanels.cloudIdDetails.cloudId.title"
                  defaultMessage="Cloud ID"
                />
              </h5>
            </EuiTitle>
          }
          checked={selectedDetail === CloudDetail.CloudId}
          onChange={() => setSelectedCloudDetail(CloudDetail.CloudId)}
        >
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="searchApiPanels.cloudIdDetails.cloudId.description"
                defaultMessage="Specific client libraries and connectors can use this unique identifier specific to Elastic Cloud."
              />
            </p>
          </EuiText>
        </EuiCheckableCard>
      )}
    </OverviewPanel>
  );
};
