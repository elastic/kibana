/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiPanel, EuiImage } from '@elastic/eui';
import { SolutionsTitle } from './solutions_title';
import { FeatureCatalogueEntry } from '../../../';
import { createAppNavigationHandler } from '../app_navigation_handler';

interface Props {
  addBasePath: (path: string) => string;
  appSearch?: FeatureCatalogueEntry;
  observability?: FeatureCatalogueEntry;
  securitySolution?: FeatureCatalogueEntry;
}

const getActionsText = (actions: Array<{ verb: string; text: string }>) => (
  <EuiText size="s" style={{ padding: '16px' }}>
    {actions.map(({ verb, text }) => (
      <p key={`${verb} ${text}`}>
        <strong>{verb}</strong> {text}
      </p>
    ))}
  </EuiText>
);

// TODO: Should this live here? Should it be registered per app?
const solutionCTAs = {
  appSearch: [
    {
      verb: i18n.translate('home.solutionsPanel.appSearch.firstActionVerb', {
        defaultMessage: 'Build',
        description:
          'The first word of this sentence is bolded. Full sentence: "Build a powerful website search."',
      }),
      text: i18n.translate('home.solutionsPanel.appSearch.firstActionText', {
        defaultMessage: 'a powerful website search.',
        description: 'Full sentence: "Build a powerful website search."',
      }),
    },
    {
      verb: i18n.translate('home.solutionsPanel.appSearch.secondActionVerb', {
        defaultMessage: 'Search',
        description:
          'The first word of this sentence is bolded. Full sentence: "Search any data from any application."',
      }),
      text: i18n.translate('home.solutionsPanel.appSearch.secondActionText', {
        defaultMessage: 'any data from any application.',
        description: 'Full sentence: "Search any data from any application."',
      }),
    },
    {
      verb: i18n.translate('home.solutionsPanel.appSearch.thirdActionVerb', {
        defaultMessage: 'Unify',
        description:
          'The first word of this sentence is bolded. Full sentence: "Unify searchable workplace content."',
      }),
      text: i18n.translate('home.solutionsPanel.appSearch.thirdActionText', {
        defaultMessage: 'searchable workplace content.',
        description: 'Full sentence: "Unify searchable workplace content."',
      }),
    },
  ],
  observability: [
    {
      verb: i18n.translate('home.solutionsPanel.observability.firstActionVerb', {
        defaultMessage: 'Monitor',
        description:
          'The first word of this sentence is bolded. Full sentence: "Monitor all infrastructure metrics."',
      }),
      text: i18n.translate('home.solutionsPanel.observability.firstActionText', {
        defaultMessage: 'all infrastructure metrics.',
        description: 'Full sentence: "Monitor all infrastructure metrics."',
      }),
    },
    {
      verb: i18n.translate('home.solutionsPanel.observability.secondActionVerb', {
        defaultMessage: 'Track',
        description:
          'The first word of this sentence is bolded. Full sentence: "Track application performance."',
      }),
      text: i18n.translate('home.solutionsPanel.observability.secondActionText', {
        defaultMessage: 'application performance.',
        description: 'Full sentence: "Track application performance."',
      }),
    },
    {
      verb: i18n.translate('home.solutionsPanel.observability.thirdActionVerb', {
        defaultMessage: 'Measure',
        description:
          'The first word of the following sentence is bolded. Full sentence: "Measure SLAs and react to issues."',
      }),
      text: i18n.translate('home.solutionsPanel.observability.thirdActionText', {
        defaultMessage: 'SLAs and react to issues.',
        description: 'Full sentence: "Measure SLAs and react to issues."',
      }),
    },
  ],
  securitySolution: [
    {
      verb: i18n.translate('home.solutionsPanel.securitySolution.firstActionVerb', {
        defaultMessage: 'Detect',
        description:
          'The first word of this sentence is bolded. Full sentence: "Detect critical security events."',
      }),
      text: i18n.translate('home.solutionsPanel.securitySolution.firstActionText', {
        defaultMessage: 'critical security events.',
        description: 'Full sentence: "Detect critical security events."',
      }),
    },
    {
      verb: i18n.translate('home.solutionsPanel.securitySolution.secondActionVerb', {
        defaultMessage: 'Investigate',
        description:
          'The first word of this sentence is bolded. Full sentence: "Investigate incidents and collaborate."',
      }),
      text: i18n.translate('home.solutionsPanel.securitySolution.secondActionText', {
        defaultMessage: 'incidents and collaborate.',
        description: 'Full sentence: "Investigate incidents and collaborate."',
      }),
    },
    {
      verb: i18n.translate('home.solutionsPanel.securitySolution.thirdActionVerb', {
        defaultMessage: 'Prevent',
        description:
          'The first word of the following sentence is bolded. Full sentence: "Prevent threats autonomously."',
      }),
      text: i18n.translate('home.solutionsPanel.securitySolution.thirdActionText', {
        defaultMessage: 'threats autonomously.',
        description: 'Full sentence: "Prevent threats autonomously."',
      }),
    },
  ],
  kibana: [
    {
      verb: i18n.translate('home.solutionsPanel.kibana.firstActionVerb', {
        defaultMessage: 'Visualize',
        description:
          'The first word of this sentence is bolded. Full sentence: "Visualize every aspect of your data."',
      }),
      text: i18n.translate('home.solutionsPanel.kibana.firstActionText', {
        defaultMessage: 'every aspect of your data.',
        description: 'Full sentence: "Visualize every aspect of your data."',
      }),
    },
    {
      verb: i18n.translate('home.solutionsPanel.kibana.secondActionVerb', {
        defaultMessage: 'Search',
        description:
          'The first word of this sentence is bolded. Full sentence: "Search and explore your data."',
      }),
      text: i18n.translate('home.solutionsPanel.kibana.secondActionText', {
        defaultMessage: 'and explore your data.',
        description: 'Full sentence: "Search and explore your data."',
      }),
    },
    {
      verb: i18n.translate('home.solutionsPanel.kibana.thirdActionVerb', {
        defaultMessage: 'Plot',
        description:
          'The first word of the following sentence is bolded. Full sentence: "Plot your geographic information."',
      }),
      text: i18n.translate('home.solutionsPanel.kibana.thirdActionText', {
        defaultMessage: 'your geographic information.',
        description: 'Full sentence: "Plot your geographic information."',
      }),
    },
    {
      verb: i18n.translate('home.solutionsPanel.kibana.fourthActionVerb', {
        defaultMessage: 'Craft',
        description:
          'The first word of this sentence is bolded. Full sentence: "Craft pixel-perfect reports."',
      }),
      text: i18n.translate('home.solutionsPanel.kibana.fourthActionText', {
        defaultMessage: 'pixel-perfect reports.',
        description: 'Full sentence: "Craft pixel-perfect reports."',
      }),
    },
    {
      verb: i18n.translate('home.solutionsPanel.kibana.fifthActionVerb', {
        defaultMessage: 'Detect',
        description:
          'The first word of this sentence is bolded. Full sentence: "Detect anomalous events."',
      }),
      text: i18n.translate('home.solutionsPanel.kibana.fifthActionText', {
        defaultMessage: 'anomalous events.',
        description: 'Full sentence: "Detect anomalous events."',
      }),
    },
    {
      verb: i18n.translate('home.solutionsPanel.kibana.sixthActionVerb', {
        defaultMessage: 'Reveal',
        description:
          'The first word of the following sentence is bolded. Full sentence: "Reveal patterns and relationships."',
      }),
      text: i18n.translate('home.solutionsPanel.kibana.sixthActionText', {
        defaultMessage: 'patterns and relationships.',
        description: 'Full sentence: "Reveal patterns and relationships."',
      }),
    },
  ],
};

export const SolutionsPanel: FunctionComponent<Props> = ({
  addBasePath,
  appSearch,
  observability,
  securitySolution,
}) => (
  <EuiFlexGroup justifyContent="spaceAround">
    {appSearch || observability || securitySolution ? (
      <EuiFlexItem>
        <EuiFlexGroup direction="column">
          {appSearch ? (
            <EuiFlexItem className="homSolutionsPanel__appSearch">
              <EuiPanel
                className="homSolutionsPanel__solutionWrapper"
                paddingSize="none"
                onClick={createAppNavigationHandler('/app/app_search')} // TODO: double check this url once enterprise search plugin is merged
              >
                <EuiFlexGroup gutterSize="none">
                  <EuiFlexItem grow={1} className="homSolutionsPanel__appSearchHeader">
                    <EuiImage
                      className="homSolutionsPanel__appSearchTopLeftImage"
                      url={addBasePath(
                        '/plugins/home/assets/background_enterprise_search_top_left_2x.png'
                      )}
                      alt="Enterprise search top left background graphic"
                    />
                    <SolutionsTitle
                      iconType="logoEnterpriseSearch"
                      title="Enterprise Search"
                      subtitle={i18n.translate('home.solutionsPanel.appSearchSubtitle', {
                        defaultMessage: 'Search everything',
                      })}
                    />
                    <EuiImage
                      className="homSolutionsPanel__appSearchBottomRightImage"
                      url={addBasePath(
                        '/plugins/home/assets/background_enterprise_search_bottom_right_2x.png'
                      )}
                      alt="Enterprise search bottom right background graphic"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={1} className="homSolutionsPanel__CTA">
                    {getActionsText(solutionCTAs.appSearch)}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ) : null}
          {observability ? (
            <EuiFlexItem className="homSolutionsPanel__observability">
              <EuiPanel
                className="homSolutionsPanel__solutionWrapper"
                paddingSize="none"
                onClick={createAppNavigationHandler(observability.path)}
              >
                <EuiFlexGroup gutterSize="none">
                  <EuiFlexItem grow={1} className="homSolutionsPanel__observabilityHeader">
                    <EuiImage
                      className="homSolutionsPanel__observabilityTopRightImage"
                      url={addBasePath(
                        '/plugins/home/assets/background_observability_top_right_2x.png'
                      )}
                      alt="Observability top right background graphic"
                    />
                    <SolutionsTitle
                      iconType={observability.icon}
                      title={observability.title}
                      subtitle={observability.description}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={1} className="homSolutionsPanel__CTA">
                    {getActionsText(solutionCTAs.observability)}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ) : null}
          {securitySolution ? (
            <EuiFlexItem className="homSolutionsPanel__securitySolution">
              <EuiPanel
                className="homSolutionsPanel__solutionWrapper"
                paddingSize="none"
                onClick={createAppNavigationHandler(securitySolution.path)}
              >
                <EuiFlexGroup gutterSize="none">
                  <EuiFlexItem grow={1} className="homSolutionsPanel__securitySolutionHeader">
                    <EuiImage
                      className="homSolutionsPanel__securitySolutionTopLeftImage"
                      url={addBasePath(
                        '/plugins/home/assets/background_security_solution_top_left_2x.png'
                      )}
                      alt="Enterprise search top left background graphic"
                    />
                    <SolutionsTitle
                      iconType={securitySolution.icon}
                      title={securitySolution.title}
                      subtitle={securitySolution.description}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={1} className="homSolutionsPanel__CTA">
                    {getActionsText(solutionCTAs.securitySolution)}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
    ) : null}
    <EuiFlexItem className="homSolutionsPanel__kibana">
      <EuiPanel
        className="homSolutionsPanel__solutionWrapper"
        paddingSize="none"
        onClick={createAppNavigationHandler('/app/dashboards')}
      >
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={1} className="homSolutionsPanel__kibanaHeader">
            <EuiImage
              className="homSolutionsPanel__kibanaTopLeftImage"
              url={addBasePath('/plugins/home/assets/background_kibana_top_left_2x.png')}
              alt="Kibana top left background graphic"
            />
            <SolutionsTitle
              iconType="logoKibana"
              title="Kibana"
              subtitle={i18n.translate('home.solutionsPanel.kibanaSubtitle', {
                defaultMessage: 'Visualize & analyze',
              })}
            />
            <EuiImage
              className="homSolutionsPanel__kibanaBottomRightImage"
              url={addBasePath('/plugins/home/assets/background_kibana_bottom_right_2x.png')}
              alt="Kibana bottom right background graphic"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1} className="homSolutionsPanel__CTA">
            {getActionsText(solutionCTAs.kibana)}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  </EuiFlexGroup>
);
