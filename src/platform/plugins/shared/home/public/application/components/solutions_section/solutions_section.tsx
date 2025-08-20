/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiScreenReaderOnly } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { i18n } from '@kbn/i18n';
import { SolutionPanel } from './solution_panel';
import type { FeatureCatalogueEntry, FeatureCatalogueSolution } from '../../..';

const sortByOrder = (
  { order: orderA = 0 }: FeatureCatalogueSolution | FeatureCatalogueEntry,
  { order: orderB = 0 }: FeatureCatalogueSolution | FeatureCatalogueEntry
) => orderA - orderB;

interface Props {
  addBasePath: (path: string) => string;
  solutions: FeatureCatalogueSolution[];
  hideSolutionsSection: boolean;
  onHideSolutionsSection: (hide: boolean) => void;
}

export const SolutionsSection: FC<Props> = ({
  addBasePath,
  solutions,
  hideSolutionsSection,
  onHideSolutionsSection,
}) => {
  if (hideSolutionsSection || solutions.length === 0) {
    return null;
  }

  const sortedSolutions = solutions.sort(sortByOrder);

  return (
    <KibanaPageTemplate.Section bottomBorder aria-labelledby="homeSolutions__section" grow={false}>
      <EuiButtonEmpty
        iconType="eyeClosed"
        onClick={() => onHideSolutionsSection(true)}
        flush="left"
      >
        {i18n.translate('home.hideSection', {
          defaultMessage: 'Hide section',
        })}
      </EuiButtonEmpty>
      <EuiScreenReaderOnly>
        <h2 id="homeSolutions__title">
          {i18n.translate('home.solutionsSectionTitle', {
            defaultMessage: 'Pick your solution',
          })}
        </h2>
      </EuiScreenReaderOnly>

      <EuiFlexGroup>
        {sortedSolutions.map((solution) => (
          <SolutionPanel addBasePath={addBasePath} key={solution.id} solution={solution} />
        ))}
      </EuiFlexGroup>
    </KibanaPageTemplate.Section>
  );
};
