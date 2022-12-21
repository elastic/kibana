/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiScreenReaderOnly } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { FormattedMessage } from '@kbn/i18n-react';
import { SolutionPanel } from './solution_panel';
import { FeatureCatalogueEntry, FeatureCatalogueSolution } from '../../..';

const sortByOrder = (
  { order: orderA = 0 }: FeatureCatalogueSolution | FeatureCatalogueEntry,
  { order: orderB = 0 }: FeatureCatalogueSolution | FeatureCatalogueEntry
) => orderA - orderB;

interface Props {
  addBasePath: (path: string) => string;
  solutions: FeatureCatalogueSolution[];
}

export const SolutionsSection: FC<Props> = ({ addBasePath, solutions }) => {
  if (solutions.length) {
    solutions = solutions.sort(sortByOrder);

    return (
      <KibanaPageTemplate.Section
        bottomBorder
        paddingSize="xl"
        aria-labelledby="homSolutions__title"
        className="homSolutions"
        contentProps={{ className: 'homSolutions__content' }}
      >
        <EuiScreenReaderOnly>
          <h2 id="homSolutions__title">
            <FormattedMessage
              id="home.solutionsSection.sectionTitle"
              defaultMessage="Pick your solution"
            />
          </h2>
        </EuiScreenReaderOnly>

        <EuiFlexGroup className="homSolutions__content">
          {solutions.map((solution) => (
            <SolutionPanel addBasePath={addBasePath} key={solution.id} solution={solution} />
          ))}
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    );
  } else {
    return null;
  }
};
