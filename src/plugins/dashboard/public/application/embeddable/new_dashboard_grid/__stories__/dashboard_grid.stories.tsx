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

export const LogsDashboardExample = () => {
  const gridData = [
    {
      x: 0,
      y: 19,
      w: 24,
      h: 18,
      id: '4',
      content: 'Logs panel',
    },
    {
      x: 0,
      y: 52,
      w: 24,
      h: 13,
      id: '9',
      content: 'Logs panel',
    },
    {
      x: 12,
      y: 6,
      w: 12,
      h: 8,
      id: '11',
      content: 'Logs panel',
    },
    {
      x: 24,
      y: 19,
      w: 24,
      h: 33,
      id: '14',
      content: 'Logs panel',
    },
    {
      x: 24,
      y: 6,
      w: 24,
      h: 13,
      id: '15',
      content: 'Logs panel',
    },
    {
      x: 0,
      y: 0,
      w: 17,
      h: 6,
      id: '343f0bef-0b19-452e-b1c8-59beb18b6f0c',
      content: 'Logs panel',
    },
    {
      x: 17,
      y: 0,
      w: 31,
      h: 6,
      id: '30326cdb-4ddd-49eb-a4f1-b555caa21d7c',
      content: 'Logs panel',
    },
    {
      x: 0,
      y: 6,
      w: 12,
      h: 8,
      id: 'bb94016e-f4a6-49ca-87a9-296a2869d570',
      content: 'Logs panel',
    },
    {
      x: 0,
      y: 14,
      w: 12,
      h: 5,
      id: '01d8e435-91c0-484f-a11e-856747050b0a',
      content: 'Logs panel',
    },
    {
      x: 12,
      y: 14,
      w: 12,
      h: 5,
      id: '8c1456d4-1993-4ba2-b701-04aca02c9fef',
      content: 'Logs panel',
    },
    {
      x: 0,
      y: 37,
      w: 24,
      h: 15,
      id: '8e59c7cf-6e42-4343-a113-c4a255fcf2ce',
      content: 'Logs panel',
    },
  ];

  return <Grid test={3} gridData={gridData} />;
};
