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

import React, { Fragment, FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiHorizontalRule } from '@elastic/eui';
import { SolutionCard } from './solution_card';
import { FeatureCatalogueEntry, FeatureCatalogueSolution } from '../../../';
import { FeatureCatalogueHomePageSection } from '../../../services';

const sortByOrder = (
  { order: orderA = 0 }: FeatureCatalogueSolution,
  { order: orderB = 0 }: FeatureCatalogueSolution
) => orderA - orderB;

interface Props {
  directories: FeatureCatalogueEntry[];
  solutions: FeatureCatalogueSolution[];
}

export const SolutionsPanel: FC<Props> = ({ directories, solutions }) => {
  const findDirectoriesBySolution = (
    solution?: FeatureCatalogueSolution
  ): FeatureCatalogueEntry[] =>
    directories.filter(
      (directory) =>
        directory.homePageSection === FeatureCatalogueHomePageSection.SOLUTION_PANEL &&
        directory.solution === solution?.id
    );

  const kibana = solutions.find(({ id }) => id === 'kibana');
  const kibanaApps = findDirectoriesBySolution(kibana);

  // Find non-Kibana solutions
  solutions = solutions.sort(sortByOrder).filter(({ id }) => id !== 'kibana');

  // Maps features to each solution
  const solutionAppMap = new Map<string, FeatureCatalogueEntry[]>();
  let appCount = 0;

  solutions.forEach((solution) => {
    const apps = findDirectoriesBySolution(solution);
    appCount += apps.length;
    solutionAppMap.set(solution.id, apps);
  });

  return appCount || kibanaApps.length ? (
    <Fragment>
      <EuiFlexGroup className="homSolutions" justifyContent="spaceAround">
        {appCount ? (
          <EuiFlexItem grow={1} className="homSolutions__group homSolutions__group--multiple">
            <EuiFlexGroup direction="column">
              {solutions.map((solution) => (
                <SolutionCard
                  key={solution.id}
                  solution={solution}
                  apps={solutionAppMap.get(solution.id)}
                />
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
        {kibana && kibanaApps.length ? <SolutionCard solution={kibana} apps={kibanaApps} /> : null}
      </EuiFlexGroup>

      <EuiHorizontalRule margin="xl" />

      <EuiSpacer size="s" />
    </Fragment>
  ) : (
    <Fragment>
      <EuiSpacer size="xl" />
    </Fragment>
  );
};
