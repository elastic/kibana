/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';

import { Props as GridProps, Grid } from '../components/grid';
import { Props as GridItemProps } from '../components/grid_item';
import {
  largeGridData,
  mediumGridData,
  smallGridData,
  simpleNestedGridData,
  nestedGridData,
} from '../../gridstack_grid/__stories__/fixtures';
import { logsDashboardGridData } from '../../gridstack_grid/constants';

export default {
  title: 'POC - dnd-kit/Grid',
  component: Grid,
  args: {
    columns: 24,
    guttersize: 4,
  },
  argTypes: {
    columns: {
      label: 'Number of columns',
      control: { type: 'select' },
      options: [12, 24, 48],
    },
    guttersize: {
      control: { type: 'select' },
      options: [0, 4, 8, 16],
    },
  },
};

const data = {
  12: smallGridData,
  24: mediumGridData,
  48: largeGridData,
};

export const BasicExample = (args: GridProps) => {
  return <Grid {...args} gridData={data[args.columns as 12 | 24 | 48] as GridItemProps[]} />;
};

export const NoGutterExample = () => <Grid guttersize={0} columns={24} gridData={mediumGridData} />;
export const SmallGutterExample = () => (
  <Grid guttersize={4} columns={24} gridData={mediumGridData} />
);
export const MediumGutterExample = () => (
  <Grid guttersize={8} columns={24} gridData={mediumGridData} />
);
export const LargeGutterExample = () => (
  <Grid guttersize={16} columns={24} gridData={mediumGridData} />
);
export const Columns48Example = () => <Grid gridData={largeGridData} />;
export const Columns24Example = () => <Grid columns={24} gridData={mediumGridData} />;
export const Columns12Example = () => <Grid columns={12} gridData={smallGridData} />;
export const LogsDashboardExample = () => <Grid gridData={logsDashboardGridData} />;
export const SimpleNestedExample = () => {
  return <Grid columns={24} gridData={simpleNestedGridData} />;
};

export const NestedGridsExample = () => {
  return <Grid columns={12} gridData={nestedGridData} />;
};
