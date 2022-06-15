/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiPanel } from '@elastic/eui';
import 'gridstack/dist/h5/gridstack-dd-native';
import { Grid } from '../components/grid';

const Item = ({ id }) => <div>I am item: {id}</div>;

export default {
  component: EuiPanel,
  title: 'Dashboard Grid Layout',
  description: 'POC of new grid layout system',
  argTypes: {},
};

export const UncontrolledExample = () => {
  return <Grid test={2} />;
};
