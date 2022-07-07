/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiPanel } from '@elastic/eui';
// import 'gridstack/dist/h5/gridstack-dd-native';
import { Grid } from '../components/grid';
import { smallGridData, mediumGridData, largeGridData } from './fixtures';

import { logsDashboardGridData } from '../constants';

import { ControlledStack } from '../components/basic_react_demos/test_react_grid_demo';
import { StyledSubgridDemo } from '../components/styled_subgrid_demo';
import { SubgridDemo } from '../components/basic_react_demos/test_subgrid_demo';

export default {
  component: EuiPanel,
  title: 'POC - Gridstack',
  description: 'POC of new grid layout system',
  argTypes: {},
};

export const BasicReactExample = () => {
  return <ControlledStack />;
};

export const NestedReactExample = () => {
  return <SubgridDemo />;
};

export const LogsDashboardExample = () => {
  return <Grid columns={48} gridData={logsDashboardGridData} />;
};

export const Columns48GridExample = () => {
  return <Grid columns={48} gridData={largeGridData} />;
};

export const Columns24GridExample = () => {
  return <Grid columns={24} gridData={mediumGridData} />;
};

export const Columns12GridExample = () => {
  return <Grid columns={12} gridData={smallGridData} />;
};

export const PanelGroupExample = () => {
  return <StyledSubgridDemo />;
};

export const EmptyExample = () => {
  return <Grid columns={24} />;
};

export const SimpleNestedExample = () => {
  return (
    <Grid
      columns={24}
      gridData={[
        {
          id: 'panel-group',
          x: 0,
          y: 0,
          w: 24,
          h: 6,
          content: 'panel-group',
          subGrid: {
            acceptWidgets: true,
            float: false,
            cellHeight: `${64}px`,
            margin: 4,
            minRow: 6,
            column: 24,
            children: [{ id: 'nested-panel', x: 0, y: 0, w: 6, h: 3, content: 'nested-panel' }],
          },
        },
        { id: 'panel1', x: 0, y: 7, w: 6, h: 3, content: 'panel1' },
      ]}
    />
  );
};

export const NestedGridsExample = () => {
  const gridData = [
    {
      id: 'regular',
      y: 0,
      content: 'regular item',
      x: 0,
      w: 1,
      h: 1,
    },
    {
      id: 'sub1',
      x: 1,
      w: 4,
      h: 4,
      subGrid: {
        dragOut: true,
        class: 'sub1',
        cellHeight: 50,
        column: 12,
        acceptWidgets: true,
        margin: 5,
        children: [
          {
            id: '0',
            x: 0,
            y: 0,
            content: '0',
            w: 1,
            h: 1,
          },
          {
            id: '1',
            x: 1,
            y: 0,
            content: '1',
            w: 1,
            h: 1,
          },
          {
            id: '2',
            x: 2,
            y: 0,
            content: '2',
            w: 1,
            h: 1,
          },
          {
            id: '3',
            x: 3,
            y: 0,
            content: '3',
            w: 1,
            h: 1,
          },
          {
            id: '4',
            x: 0,
            y: 1,
            content: '4',
            w: 1,
            h: 1,
          },
          {
            id: '5',
            x: 1,
            y: 1,
            content: '5',
            w: 1,
            h: 1,
          },
        ],
      },
      y: 0,
    },
    {
      id: 'sub2',
      x: 5,
      w: 3,
      h: 4,
      y: 0,
      subGrid: {
        class: 'sub2',
        cellHeight: 50,
        column: 12,
        acceptWidgets: true,
        margin: 5,
        children: [
          {
            id: '6',
            x: 0,
            y: 0,
            content: '6',
            w: 1,
            h: 1,
          },
          {
            id: '7',
            x: 0,
            y: 1,
            w: 2,
            content: '7',
            h: 1,
          },
        ],
      },
    },
  ];
  return <Grid columns={12} gridData={gridData} />;
};
