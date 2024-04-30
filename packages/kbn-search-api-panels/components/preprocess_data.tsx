/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiThemeProvider,
  EuiTitle,
  EuiToken,
  EuiPanel,
  EuiLink,
  EuiFlexGrid,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const PreprocessDataPanel: React.FC = () => {
  return (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel paddingSize="xl">
        <EuiFlexGrid direction="column" columns={2} gutterSize="xl">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <EuiToken iconType="sparkles" size="l" color="#466B8D" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate(
                      'searchApiPanels.preprocessData.overview.dataEnrichment.title',
                      {
                        defaultMessage: 'Data enrichment',
                      }
                    )}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'searchApiPanels.preprocessData.overview.dataEnrichment.description',
                      {
                        defaultMessage:
                          'Add information from external sources or apply transformations to your documents for more contextual, insightful search.',
                      }
                    )}
                  </p>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiText>
                  <p>
                    <EuiLink href={'#'} target="_blank">
                      {i18n.translate(
                        'searchApiPanels.preprocessData.overview.dataEnrichment.learnMore',
                        {
                          defaultMessage: 'Learn More',
                        }
                      )}
                    </EuiLink>
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <EuiToken iconType="logstashFilter" size="l" color="#466B8D" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate('searchApiPanels.pipeline.overview.dataFiltering.title', {
                      defaultMessage: 'Data filtering',
                    })}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  {i18n.translate('searchApiPanels.pipeline.overview.dataFiltering.description', {
                    defaultMessage:
                      'Remove fields from documents like sensitive information from documents before indexing.',
                  })}
                </EuiText>
                <EuiSpacer size="s" />
                <EuiText>
                  <p>
                    <EuiLink href={'#'} target="_blank">
                      {i18n.translate(
                        'searchApiPanels.preprocessData.overview.dataFiltering.learnMore',
                        {
                          defaultMessage: 'Learn More',
                        }
                      )}
                    </EuiLink>
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <EuiToken iconType="tokenArray" size="l" fill="none" color="#466B8D" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate('searchApiPanels.pipeline.overview.arrayJsonHandling.title', {
                      defaultMessage: 'Array/JSON handling',
                    })}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  {i18n.translate(
                    'searchApiPanels.pipeline.overview.arrayJsonHandling.description',
                    {
                      defaultMessage: 'Run batch processors,  parse JSON data and sort elements.',
                    }
                  )}
                </EuiText>
                <EuiSpacer size="s" />
                <EuiText>
                  <p>
                    <EuiLink href={'#'} target="_blank">
                      {i18n.translate(
                        'searchApiPanels.preprocessData.overview.arrayJsonHandling.learnMore',
                        {
                          defaultMessage: 'Learn More',
                        }
                      )}
                    </EuiLink>
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <EuiToken iconType="cut" size="l" color="#466B8D" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate('searchApiPanels.pipeline.overview.dataTransformation.title', {
                      defaultMessage: 'Data transformation',
                    })}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  {i18n.translate(
                    'searchApiPanels.pipeline.overview.dataTransformation.description',
                    {
                      defaultMessage:
                        'Parse information from your documents to ensure they conform to a standardized format.',
                    }
                  )}
                </EuiText>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <p>
                    <EuiLink href={'#'} target="_blank">
                      {i18n.translate(
                        'searchApiPanels.preprocessData.overview.dataTransformation.learnMore',
                        {
                          defaultMessage: 'Learn More',
                        }
                      )}
                    </EuiLink>
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <EuiToken iconType="controlsVertical" size="l" color="#466B8D" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate('searchApiPanels.pipeline.overview.pipelineHandling.title', {
                      defaultMessage: 'Pipeline handling',
                    })}
                  </h3>
                </EuiTitle>

                <EuiText size="s">
                  {i18n.translate(
                    'searchApiPanels.pipeline.overview.pipelineHandling.description',
                    {
                      defaultMessage:
                        'Handle error exceptions, execute another pipeline or reroute document to another index',
                    }
                  )}
                </EuiText>
                <EuiSpacer size="s" />
                <EuiText>
                  <p>
                    <EuiLink href={'#'} target="_blank">
                      {i18n.translate(
                        'searchApiPanels.preprocessData.overview.pipelineHandling.learnMore',
                        {
                          defaultMessage: 'Learn More',
                        }
                      )}
                    </EuiLink>
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGrid>
      </EuiPanel>
    </EuiThemeProvider>
  );
};
