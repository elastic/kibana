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

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { FeatureCatalogueEntry, FeatureCatalogueSolution } from '../../../';
import { createAppNavigationHandler } from '../app_navigation_handler';
import { SolutionTitle } from './solution_title';

const getDescriptionText = ({ description }: FeatureCatalogueEntry): JSX.Element => (
  <EuiText size="s" key={`${description}`}>
    <p>{description}</p>
  </EuiText>
);

const addSpacersBetweenElementsReducer = (
  acc: JSX.Element[],
  element: JSX.Element,
  index: number,
  elements: JSX.Element[]
) => {
  acc.push(element);
  if (index < elements.length - 1) {
    acc.push(<EuiSpacer key={`homeSolutionsPanel__UseCaseSpacer${index}`} size="m" />);
  }
  return acc;
};

const getAppDescriptions = (apps: FeatureCatalogueEntry[]) =>
  apps
    .sort(sortByOrder)
    .map(getDescriptionText)
    .reduce<JSX.Element[]>(addSpacersBetweenElementsReducer, []);

const sortByOrder = (
  { order: orderA = 0 }: FeatureCatalogueEntry,
  { order: orderB = 0 }: FeatureCatalogueEntry
) => orderA - orderB;

interface Props {
  solution: FeatureCatalogueSolution;
  apps?: FeatureCatalogueEntry[];
}

export const SolutionCard: FC<Props> = ({ solution, apps = [] }) =>
  solution && apps.length ? (
    <EuiFlexItem
      key={solution.id}
      className={`${
        solution.id === 'kibana' ? 'homSolutions__group homSolutions__group--single' : ''
      } homSolutions__item`}
      grow={1}
    >
      <EuiPanel
        paddingSize="none"
        className={`homSolutionPanel homSolutionPanel--${solution.id}`}
        onClick={createAppNavigationHandler(solution.path)} // TODO: double check this url once enterprise search overview page is available
      >
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={1} className={`homSolutionPanel__header`}>
            <SolutionTitle
              iconType={solution.icon}
              title={solution.title}
              subtitle={solution.description}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={1} className="homSolutionPanel__content">
            {getAppDescriptions(apps)}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  ) : null;
