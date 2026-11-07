/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { PlanNode, PlanTree } from './plan_tree';
import { PlanTab } from './plan_tree_chart';

const node = (
  id: string,
  label: string,
  selfNanos: number,
  children: PlanNode[] = [],
  hasOperator = true
): PlanNode => ({
  id,
  name: label,
  label,
  detail: '',
  children,
  hasOperator,
  selfNanos,
  inclusiveNanos: selfNanos + children.reduce((sum, child) => sum + child.inclusiveNanos, 0),
  rowsIn: 0,
  rowsOut: 0,
});

const tree: PlanTree = {
  root: node('a', 'Output', 1e6, [
    node('b', 'Aggregate', 2e6, [node('c', 'EsQuery', 7e6), node('d', 'Filter', 0, [], false)]),
  ]),
  totalNanos: 10e6,
};

describe('PlanTab', () => {
  it('draws a box for each node', () => {
    render(
      <I18nProvider>
        <PlanTab tree={tree} />
      </I18nProvider>
    );
    expect(screen.getAllByTestId('esqlQueryProfilePlanNode')).toHaveLength(4);
  });

  it('shows a card on hover', async () => {
    render(
      <I18nProvider>
        <PlanTab tree={tree} />
      </I18nProvider>
    );
    await userEvent.hover(screen.getAllByTestId('esqlQueryProfilePlanNode')[2]);
    expect(screen.getByTestId('esqlQueryProfilePlanTooltip')).toHaveTextContent('EsQuery');
    expect(screen.getByTestId('esqlQueryProfilePlanTooltip')).toHaveTextContent('70%');
  });

  it('zooms into a node and back out', async () => {
    render(
      <I18nProvider>
        <PlanTab tree={tree} />
      </I18nProvider>
    );
    await userEvent.click(screen.getAllByTestId('esqlQueryProfilePlanNode')[1]);
    expect(screen.getAllByTestId('esqlQueryProfilePlanNode')).toHaveLength(3);
    await userEvent.click(screen.getByTestId('esqlQueryProfilePlanReset'));
    expect(screen.getAllByTestId('esqlQueryProfilePlanNode')).toHaveLength(4);
  });
});
