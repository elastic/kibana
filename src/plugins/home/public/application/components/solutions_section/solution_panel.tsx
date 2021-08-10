/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { snakeCase } from 'lodash';
import React, { FC, MouseEvent } from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToken,
} from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { FeatureCatalogueEntry, FeatureCatalogueSolution } from '../../../';
import { createAppNavigationHandler } from '../app_navigation_handler';
import { SolutionTitle } from './solution_title';
import { getServices } from '../../kibana_services';
import { PLUGIN_ID } from '../../../../common/constants';

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

  const getSolutionGraphicURL = (solutionId: string) =>
    `/plugins/${PLUGIN_ID}/assets/solutions_${solutionId}_2x.png`;

  return (
    <>
      {/* <EuiFlexItem
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
      </EuiFlexItem> */}

      <EuiFlexItem
        className="homSolutions__item"
        data-test-subj={`homSolutionPanel homSolutionPanel_${solution.id}`}
      >
        <EuiCard
          className={`homSolutionPanel homSolutionPanel--${solution.id}`}
          description={solution.description}
          href={addBasePath(solution.path)}
          icon={
            <EuiToken
              className="homSolutionPanel__icon"
              iconType={solution.icon}
              shape="circle"
              size="l"
            />
          }
          image={addBasePath(getSolutionGraphicURL(snakeCase(solution.id)))}
          onClick={(event: MouseEvent) => {
            trackUiMetric(METRIC_TYPE.CLICK, `solution_panel_${solution.id}`);
            createAppNavigationHandler(solution.path)(event);
          }}
          title={solution.title}
          titleElement="h3"
        />
      </EuiFlexItem>
    </>
  );
};
