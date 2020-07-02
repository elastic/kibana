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
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { SolutionsTitle } from './solutions_title';
import { FeatureCatalogueEntry } from '../../../';
import { createAppNavigationHandler } from '../app_navigation_handler';

interface Props {
  addBasePath: (path: string) => string;
  findDirectoryById: (id: string) => FeatureCatalogueEntry;
}

// TODO: Bolding the first word/verb won't look write in other languages
const getActionText = ({ verb, text }: { verb: string; text: string }): JSX.Element => (
  <EuiText size="s" key={`${verb} ${text}`}>
    <p>
      <strong>{verb}</strong> {text}
    </p>
  </EuiText>
);

// TODO: Should this live here? Should it be registered per app?
const solutionCTAs: { [key: string]: any } = {
  enterpriseSearch: {
    websiteSearch: {
      verb: i18n.translate('home.solutionsPanel.enterpriseSearch.firstActionVerb', {
        defaultMessage: 'Build',
        description:
          'The first word of this sentence is bolded. Full sentence: "Build a powerful website search."',
      }),
      text: i18n.translate('home.solutionsPanel.enterpriseSearch.firstActionText', {
        defaultMessage: 'a powerful website search.',
        description: 'Full sentence: "Build a powerful website search."',
      }),
    },
    appSearch: {
      verb: i18n.translate('home.solutionsPanel.enterpriseSearch.secondActionVerb', {
        defaultMessage: 'Search',
        description:
          'The first word of this sentence is bolded. Full sentence: "Search any data from any application."',
      }),
      text: i18n.translate('home.solutionsPanel.enterpriseSearch.secondActionText', {
        defaultMessage: 'any data from any application.',
        description: 'Full sentence: "Search any data from any application."',
      }),
    },
    workplaceSearch: {
      verb: i18n.translate('home.solutionsPanel.enterpriseSearch.thirdActionVerb', {
        defaultMessage: 'Unify',
        description:
          'The first word of this sentence is bolded. Full sentence: "Unify searchable workplace content."',
      }),
      text: i18n.translate('home.solutionsPanel.enterpriseSearch.thirdActionText', {
        defaultMessage: 'searchable workplace content.',
        description: 'Full sentence: "Unify searchable workplace content."',
      }),
    },
  },
  observability: {
    metrics: {
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
    apm: {
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
    uptime: {
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
  },
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
  kibana: {
    dashboard: {
      verb: i18n.translate('home.solutionsPanel.kibana.dashboardVerb', {
        defaultMessage: 'Visualize',
        description:
          'The first word of this sentence is bolded. Full sentence: "Visualize every aspect of your data."',
      }),
      text: i18n.translate('home.solutionsPanel.kibana.dashboardText', {
        defaultMessage: 'every aspect of your data.',
        description: 'Full sentence: "Visualize every aspect of your data."',
      }),
    },
    discover: {
      verb: i18n.translate('home.solutionsPanel.kibana.discoverVerb', {
        defaultMessage: 'Search',
        description:
          'The first word of this sentence is bolded. Full sentence: "Search and explore your data."',
      }),
      text: i18n.translate('home.solutionsPanel.kibana.discoverText', {
        defaultMessage: 'and explore your data.',
        description: 'Full sentence: "Search and explore your data."',
      }),
    },
    canvas: {
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
    maps: {
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
    ml: {
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
    graph: {
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
  },
};

const halfWidthClass = 'homeSolutionsPanel--restrictHalfWidth';

export const SolutionsPanel: FunctionComponent<Props> = ({
  addBasePath,
  findDirectoryById
}) => {
  const observability = findDirectoryById('observability');
  const enterpriseSearch = findDirectoryById('appSearch');
  const securitySolution = findDirectoryById('securitySolution');


  const addSpacersBetweenReducer = (
    acc: JSX.Element[],
    element: JSX.Element,
    index: number,
    elements: JSX.Element[]
  ) => {
    acc.push(element);
    if (index < elements.length - 1) {
      acc.push(<EuiSpacer key={`homeSolutionsPanel__CTASpacer${index}`} size="m" />);
    }
    return acc;
  };

  const getActionsBySolution = (solution: string, appIds: string[]): JSX.Element[] =>
    appIds.reduce<JSX.Element[]>((acc: JSX.Element[], appId: string, index: number) => {
      const directory = findDirectoryById(appId);
      if (directory) {
        const CTA = solutionCTAs[solution][appId] as { verb: string; text: string };
        if (CTA) {
          // acc.push(directory.description);
          acc.push(getActionText(CTA));
        }
      }
      return acc;
    }, [] as JSX.Element[]);

  const enterpriseSearchAppIds = ['webSearch', 'appSearch', 'workplaceSearch'];
  const observabilityAppIds = ['metrics', 'apm', 'uptime'];
  const kibanaAppIds = ['dashboard', 'discover', 'canvas', 'maps', 'ml', 'graph'];

  const enterpriseSearchActions = getActionsBySolution(
    'enterpriseSearch',
    enterpriseSearchAppIds
  ).reduce(addSpacersBetweenReducer, []);
  const observabilityActions = getActionsBySolution('observability', observabilityAppIds).reduce(
    addSpacersBetweenReducer,
    []
  );
  const securitySolutionActions = solutionCTAs.securitySolution
    .map(getActionText)
    .reduce(addSpacersBetweenReducer, []);
  const kibanaActions = getActionsBySolution('kibana', kibanaAppIds).reduce(
    addSpacersBetweenReducer,
    []
  );

const halfWidthClass = 'homSolutionsPanel--restrictHalfWidth';

  return (
  <EuiFlexGroup justifyContent="spaceAround">
      {enterpriseSearchActions.length || observabilityActions.length || securitySolution ? (

      <EuiFlexItem className={halfWidthClass}>
        {/* TODO: once app search is merged, register add to feature catalogue and remove hard coded text here */}
        <EuiFlexGroup direction="column">
        {enterpriseSearchActions.length ? (

            <EuiFlexItem className="homSolutionsPanel__enterpriseSearch">
              <EuiPanel
                paddingSize="none"
                className="homSolutionsPanel__solutionPanel"
                onClick={createAppNavigationHandler('/app/enterprise_search/app_search')} // TODO: double check this url once enterprise search overview page is available
              >
                <EuiFlexGroup gutterSize="none">
                  <EuiFlexItem
                    grow={1}
                    className="homSolutionsPanel__header homSolutionsPanel__enterpriseSearchHeader"
                  >
                    <EuiImage
                      className="homSolutionsPanel__enterpriseSearchTopLeftImage"
                      url={addBasePath(
                        '/plugins/home/assets/background_enterprise_search_top_left_2x.png'
                      )}
                      alt="Enterprise search top left background graphic"
                    />
                    <SolutionsTitle
                      iconType="logoEnterpriseSearch"
                      title="Enterprise Search"
                      subtitle={i18n.translate('home.solutionsPanel.enterpriseSearchSubtitle', {
                        defaultMessage: 'Search everything',
                      })}
                    />
                    <EuiImage
                      className="homSolutionsPanel__enterpriseSearchBottomRightImage"
                      url={addBasePath(
                        '/plugins/home/assets/background_enterprise_search_bottom_right_2x.png'
                      )}
                      alt="Enterprise search bottom right background graphic"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={1} className="homSolutionsPanel__CTA">
                      {enterpriseSearchActions}
                    </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ) : null}
             {observabilityActions.length ? (

            <EuiFlexItem className="homSolutionsPanel__observability">
              <EuiPanel
                paddingSize="none"
                className="homSolutionsPanel__solutionPanel"
                // onClick={createAppNavigationHandler(observability.path)}
                onClick={createAppNavigationHandler('/app/observability#/landing')}

              >
                <EuiFlexGroup gutterSize="none">
                  <EuiFlexItem
                    grow={1}
                    className="homSolutionsPanel__header homSolutionsPanel__observabilityHeader"
                  >
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
                      {observabilityActions}
                    </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ) : null}
          {securitySolution ? (
            <EuiFlexItem className="homSolutionsPanel__securitySolution">
              <EuiPanel
                paddingSize="none"
                className="homSolutionsPanel__solutionPanel"
                onClick={createAppNavigationHandler(securitySolution.path)}
              >
                <EuiFlexGroup gutterSize="none">
                  <EuiFlexItem
                    grow={1}
                    className="homSolutionsPanel__header homSolutionsPanel__securitySolutionHeader"
                  >
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
                      {securitySolutionActions}
                    </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
    ) : null}
{kibanaActions.length ? (
    <EuiFlexItem className={`homSolutionsPanel__kibana ${halfWidthClass}`}>
      <EuiPanel
        paddingSize="none"
        className="homSolutionsPanel__solutionPanel"
        onClick={createAppNavigationHandler('/app/dashboards')}
      >
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem
            grow={1}
            className="homSolutionsPanel__header homSolutionsPanel__kibanaHeader"
          >
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
                {kibanaActions}
              </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>):null}
  </EuiFlexGroup>
);}
