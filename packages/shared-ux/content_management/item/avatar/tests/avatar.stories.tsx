/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { CmAvatar } from '../avatar';
import { context } from '../../../context';
import { createCmStateWithFixtures } from '../../../state/mocks/factory';

export default {
  title: 'Content Management/Item/Avatar/Avatar',
  description:
    'A connected container component of "avatar" view for a single content item.',
  parameters: {},
};

const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state] = React.useState(() => createCmStateWithFixtures());

  console.log(state);

  return (
    <context.Provider value={{ cache: state.cache }}>
      {children}
    </context.Provider>
  );
};

export const SingleUser = () => (
  <Provider>
    <CmAvatar id={'user:123'} />
  </Provider>
);

export const SingleDashboard = () => (
  <Provider>
    <CmAvatar id={'dashboard:xyz'} />
  </Provider>
);

export const SmallUserAndBigDashboard = () => (
  <Provider>
    <CmAvatar id={'user:456'} size={'s'} />
    <br />
    <CmAvatar id={'dashboard:xyz'} size={'l'} />
  </Provider>
);

export const CustomRedAndBlueColors = () => (
  <Provider>
    <CmAvatar id={'user:789'} />
    <br />
    <CmAvatar id={'dashboard:abc'} />
  </Provider>
);
