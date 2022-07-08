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
import {
  smallGridData,
  mediumGridData,
  largeGridData,
  simpleNestedGridData,
  nestedGridData,
} from './fixtures';

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
  return <Grid columns={24} gridData={simpleNestedGridData} />;
};

export const NestedGridsExample = () => {
  return <Grid columns={12} gridData={nestedGridData} />;
};
