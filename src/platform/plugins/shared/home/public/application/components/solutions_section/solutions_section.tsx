/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
        aria-labelledby="homeSolutions__title"
      >
        <EuiScreenReaderOnly>
          <h2 id="homeSolutions__title">
            <FormattedMessage
              id="home.solutionsSection.sectionTitle"
              defaultMessage="Pick your solution"
            />
          </h2>
        </EuiScreenReaderOnly>

        <EuiFlexGroup>
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

//     '& .homeSolutions__content': {
//       paddingBlockStart: 0,
//     } doesn't make any difference. especially given that we are using paddingSize=xl on template. visually see no difference either

// className="homSolutions" https://github.com/MichaelMarcialis/kibana/commit/532f2d70e84af2aec4df06331643fbb6e0ba5033#diff-cb7678fe754c5fd50e7eea9ed64146d71ce78037be797f7eb04b4735d99ffdbdR21
