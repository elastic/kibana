/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { CmAvatar } from '../avatar';
import { StateProviderWithFixtures } from '../../../context/mocks';

export default {
  title: 'Content Management/Item/Avatar/Avatar',
  description:
    'A connected container component of "avatar" view for a single content item.',
  parameters: {},
};

export const SingleUser = () => (
  <StateProviderWithFixtures>
    <CmAvatar id={'user:123'} />
  </StateProviderWithFixtures>
);

export const SingleDashboard = () => (
  <StateProviderWithFixtures>
    <CmAvatar id={'dashboard:xyz'} />
  </StateProviderWithFixtures>
);

export const SmallUserAndBigDashboard = () => (
  <StateProviderWithFixtures>
    <CmAvatar id={'user:456'} size={'s'} />
    <br />
    <CmAvatar id={'dashboard:xyz'} size={'l'} />
  </StateProviderWithFixtures>
);

export const CustomRedAndBlueColors = () => (
  <StateProviderWithFixtures>
    <CmAvatar id={'user:789'} />
    <br />
    <CmAvatar id={'dashboard:abc'} />
  </StateProviderWithFixtures>
);

export const SizeScale = () => {
  return (
    <StateProviderWithFixtures>
      <CmAvatar id={'dashboard:xyz'} size={'s'} />
      <CmAvatar id={'dashboard:xyz'} size={'m'} />
      <CmAvatar id={'dashboard:xyz'} size={'l'} />
      <CmAvatar id={'dashboard:xyz'} size={'xl'} />

      <br />

      <CmAvatar id={'user:456'} size={'s'} />
      <CmAvatar id={'user:456'} size={'m'} />
      <CmAvatar id={'user:456'} size={'l'} />
      <CmAvatar id={'user:456'} size={'xl'} />
    </StateProviderWithFixtures>
  );
};
