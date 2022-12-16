/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexGridProps, EuiFlexItem } from '@elastic/eui';
import { SampleDataCard } from '@kbn/home-sample-data-card';

import { useList } from './hooks';

/**
 * Props for the `SampleDataCards` component.
 */
export interface Props {
  /** Number of columns, defaults to 3. */
  columns?: EuiFlexGridProps['columns'];
}

/**
 * Fetches and displays a collection of Sample Data Sets in a grid.
 */
export const SampleDataCards = ({ columns = 3 }: Props) => {
  const [sampleDataSets, refresh] = useList();

  const cards = sampleDataSets.map((sampleDataSet) => (
    <EuiFlexItem key={sampleDataSet.id}>
      <SampleDataCard sampleDataSet={sampleDataSet} onStatusChange={refresh} />
    </EuiFlexItem>
  ));

  return (
    <EuiFlexGrid {...{ columns }} gutterSize="xl">
      {cards}
    </EuiFlexGrid>
  );
};
