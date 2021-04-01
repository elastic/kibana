/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiCallOut, EuiFlexItem } from '@elastic/eui';

import { ExperimentSolution, ExperimentID, Experiment } from '../../../common';
import { ExperimentListItem, Props as ExperimentListItemProps } from './experiment_list_item';

import { ExperimentsStrings } from '../../i18n';

const { List: strings } = ExperimentsStrings.Components;

export interface Props {
  solutions?: ExperimentSolution[];
  experiments: Record<ExperimentID, Experiment>;
  onStatusChange: ExperimentListItemProps['onStatusChange'];
}

const EmptyList = () => (
  <EuiFlexItem style={{ margin: '24px 12px' }}>
    <EuiCallOut title={strings.getNoExperimentsMessage()} />
  </EuiFlexItem>
);

export const ExperimentsList = (props: Props) => {
  const { solutions, experiments, onStatusChange } = props;

  const items = Object.values(experiments)
    .map((experiment) => {
      // Filter out any panels that don't match the solutions filter, (if provided).
      if (solutions && !solutions.some((solution) => experiment.solutions.includes(solution))) {
        return null;
      }

      return (
        <ExperimentListItem
          experiment={experiment}
          key={experiment.id}
          onStatusChange={onStatusChange}
        />
      );
    })
    .filter((item) => item !== null);

  return (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
      {items.length > 0 ? items : <EmptyList />}
    </EuiFlexGroup>
  );
};
