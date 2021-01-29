/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { FC, MouseEvent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { FeatureCatalogueEntry, FeatureCatalogueSolution } from '../../../';
import { createAppNavigationHandler } from '../app_navigation_handler';
import { SolutionTitle } from './solution_title';
import { getServices } from '../../kibana_services';

const getDescriptionText = (description: string): JSX.Element => (
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

const getDescriptions = (appDescriptions: string[]) =>
  appDescriptions
    .map(getDescriptionText)
    .reduce<JSX.Element[]>(addSpacersBetweenElementsReducer, []);

interface Props {
  addBasePath: (path: string) => string;
  solution: FeatureCatalogueSolution;
  apps?: FeatureCatalogueEntry[];
}

export const SolutionPanel: FC<Props> = ({ addBasePath, solution, apps = [] }) => {
  const { trackUiMetric } = getServices();

  return (
    <EuiFlexItem
      key={solution.id}
      data-test-subj={`homSolutionPanel homSolutionPanel_${solution.id}`}
      className={`${
        solution.id === 'kibana' ? 'homSolutions__group homSolutions__group--single' : ''
      } homSolutions__item`}
      grow={1}
    >
      <a
        className={`homSolutionPanel homSolutionPanel--${solution.id}`}
        href={addBasePath(solution.path)}
        onClick={(event: MouseEvent) => {
          trackUiMetric(METRIC_TYPE.CLICK, `solution_panel_${solution.id}`);
          createAppNavigationHandler(solution.path)(event);
        }}
      >
        <EuiPanel className="homSolutionPanel__inner" paddingSize="none">
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem grow={1} className={`homSolutionPanel__header`}>
              <SolutionTitle
                iconType={solution.icon}
                title={solution.title}
                subtitle={solution.subtitle}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={1} className="homSolutionPanel__content">
              {getDescriptions(
                apps.length ? apps.map(({ subtitle = '' }) => subtitle) : solution.appDescriptions
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </a>
    </EuiFlexItem>
  );
};
