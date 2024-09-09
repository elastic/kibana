/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiThemeProvider,
  EuiTitle,
  EuiPanel,
  EuiLink,
  EuiFlexGrid,
  EuiImage,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import React from 'react';

export const PreprocessDataPanel: React.FC<{
  docLinks: {
    arrayOrJson: string;
    dataEnrichment: string;
    dataFiltering: string;
    dataTransformation: string;
    pipelineHandling: string;
  };
  images: {
    dataEnrichment: string;
    dataTransformation: string;
    dataFiltering: string;
    pipelineHandling: string;
    arrayHandling: string;
  };
}> = ({ docLinks, images }) => {
  const color = euiThemeVars.euiColorVis1_behindText;
  return (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel paddingSize="xl">
        <EuiFlexGrid direction="column" columns={2} gutterSize="xl">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <EuiImage alt="" src={images.dataEnrichment} color={color} />
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
                    <EuiLink
                      href={docLinks.dataEnrichment}
                      target="_blank"
                      aria-label={i18n.translate(
                        'searchApiPanels.preprocessData.overview.dataEnrichment.learnMore.ariaLabel',
                        {
                          defaultMessage: 'Learn more about data enrichment',
                        }
                      )}
                    >
                      {i18n.translate(
                        'searchApiPanels.preprocessData.overview.dataEnrichment.learnMore',
                        {
                          defaultMessage: 'Learn more',
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
                <EuiImage alt="" src={images.dataFiltering} color={color} />
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
                      'Remove specific fields from documents before indexing, to exclude unnecessary or sensitive information.',
                  })}
                </EuiText>
                <EuiSpacer size="s" />
                <EuiText>
                  <p>
                    <EuiLink
                      href={docLinks.dataFiltering}
                      target="_blank"
                      aria-label={i18n.translate(
                        'searchApiPanels.preprocessData.overview.dataFiltering.learnMore.ariaLabel',
                        {
                          defaultMessage: 'Learn more about data filtering',
                        }
                      )}
                    >
                      {i18n.translate(
                        'searchApiPanels.preprocessData.overview.dataFiltering.learnMore',
                        {
                          defaultMessage: 'Learn more',
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
                <EuiImage alt="" src={images.arrayHandling} color={color} />
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
                      defaultMessage: 'Run batch processors, parse JSON data and sort elements.',
                    }
                  )}
                </EuiText>
                <EuiSpacer size="s" />
                <EuiText>
                  <p>
                    <EuiLink
                      href={docLinks.arrayOrJson}
                      target="_blank"
                      aria-label={i18n.translate(
                        'searchApiPanels.preprocessData.overview.arrayJsonHandling.learnMore.ariaLabel',
                        {
                          defaultMessage: 'Learn more about array/JSON handling',
                        }
                      )}
                    >
                      {i18n.translate(
                        'searchApiPanels.preprocessData.overview.arrayJsonHandling.learnMore',
                        {
                          defaultMessage: 'Learn more',
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
                <EuiImage alt="" src={images.dataTransformation} color={color} />
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
                    <EuiLink
                      href={docLinks.dataTransformation}
                      target="_blank"
                      aria-label={i18n.translate(
                        'searchApiPanels.preprocessData.overview.dataTransformation.learnMore.ariaLabel',
                        {
                          defaultMessage: 'Learn more about data transformation',
                        }
                      )}
                    >
                      {i18n.translate(
                        'searchApiPanels.preprocessData.overview.dataTransformation.learnMore',
                        {
                          defaultMessage: 'Learn more',
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
                <EuiImage alt="" src={images.pipelineHandling} color={color} />
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
                        'Handle error exceptions, execute another pipeline, or reroute documents to another index',
                    }
                  )}
                </EuiText>
                <EuiSpacer size="s" />
                <EuiText>
                  <p>
                    <EuiLink
                      href={docLinks.pipelineHandling}
                      target="_blank"
                      aria-label={i18n.translate(
                        'searchApiPanels.preprocessData.overview.pipelineHandling.learnMore.ariaLabel',
                        {
                          defaultMessage: 'Learn more about pipeline handling',
                        }
                      )}
                    >
                      {i18n.translate(
                        'searchApiPanels.preprocessData.overview.pipelineHandling.learnMore',
                        {
                          defaultMessage: 'Learn more',
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
