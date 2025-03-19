/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  EuiThemeProvider,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiImage,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface PipelinePanelProps {
  clusterImage: string;
  cutImage: string;
  reporterImage: string;
}

export const PipelinePanel: React.FC<PipelinePanelProps> = ({
  clusterImage,
  cutImage,
  reporterImage,
}) => {
  return (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel paddingSize="xl">
        <EuiFlexGroup direction="column" gutterSize="xl">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <EuiImage alt="" src={clusterImage} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate('searchApiPanels.pipeline.overview.dataEnrichment.title', {
                      defaultMessage: 'Enrich Data',
                    })}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'searchApiPanels.pipeline.overview.dataEnrichment.description',
                      {
                        defaultMessage:
                          'Add information from external sources or apply transformations to your documents for more contextual, insightful search.',
                      }
                    )}
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <EuiImage alt="" src={cutImage} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate('searchApiPanels.pipeline.overview.extAndStandard.title', {
                      defaultMessage: 'Extract and standardize',
                    })}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  {i18n.translate('searchApiPanels.pipeline.overview.extAndStandard.description', {
                    defaultMessage:
                      'Parse information from your documents to ensure they conform to a standardized format.',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <EuiImage alt="" src={reporterImage} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate('searchApiPanels.pipeline.overview.anonymization.title', {
                      defaultMessage: 'Anonymize data',
                    })}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  {i18n.translate('searchApiPanels.pipeline.overview.anonymization.description', {
                    defaultMessage: 'Remove sensitive information from documents before indexing.',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiThemeProvider>
  );
};
