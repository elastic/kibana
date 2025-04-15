/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { snakeCase } from 'lodash';
import React, { FC, MouseEvent } from 'react';
import { css } from '@emotion/react';
import { EuiCard, EuiFlexItem, UseEuiTheme, mathWithUnits } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { KibanaPageTemplateSolutionNavAvatar } from '@kbn/kibana-react-plugin/public';
import { FeatureCatalogueSolution } from '../../..';
import { createAppNavigationHandler } from '../app_navigation_handler';
import { getServices } from '../../kibana_services';

interface Props {
  addBasePath: (path: string) => string;
  solution: FeatureCatalogueSolution;
}

const getSolutionGraphicURL = (solutionId: string) =>
  `/plugins/kibanaReact/assets/solutions_${solutionId}.svg`;

export const SolutionPanel: FC<Props> = ({ addBasePath, solution }) => {
  const { trackUiMetric } = getServices();

  return (
    <EuiFlexItem css={styles} data-test-subj={`homeSolutionPanel homeSolutionPanel_${solution.id}`}>
      <EuiCard
        className={`homeSolutionPanel homeSolutionPanel--${solution.id}`}
        description={solution.description}
        href={addBasePath(solution.path)}
        icon={
          <KibanaPageTemplateSolutionNavAvatar
            name={solution.title}
            iconType={solution.icon}
            size="xl"
          />
        }
        image={addBasePath(getSolutionGraphicURL(snakeCase(solution.id)))}
        onClick={(event: MouseEvent) => {
          trackUiMetric(METRIC_TYPE.CLICK, `solution_panel_${solution.id}`);
          createAppNavigationHandler(solution.path)(event);
        }}
        title={solution.title}
        titleElement="h2"
      />
    </EuiFlexItem>
  );
};

const styles = ({ euiTheme }: UseEuiTheme) =>
  css({
    [`@media (min-width: ${euiTheme.breakpoint.m}px)`]: {
      maxInlineSize: `calc(33.33% - ${euiTheme.size.m} * 10)`,
    },
    '.homeSolutionPanel': {
      img: {
        backgroundColor: euiTheme.colors.primary,
        maxBlockSize: mathWithUnits(euiTheme.size.m, (x) => x * 10),
        objectFit: 'cover',
      },

      '&--enterpriseSearch img': {
        backgroundColor: euiTheme.colors.warning,
      },

      '&--observability img': {
        backgroundColor: euiTheme.colors.accent,
      },

      '&--securitySolution img': {
        backgroundColor: euiTheme.colors.accentSecondary,
      },
    },
  });
