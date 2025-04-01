/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { CardsNavigation as Component } from './cards_navigation';
import { mockProps } from '../mocks/storybook.mock';

import mdx from '../README.mdx';

export default {
  title: 'Developer/Cards Navigation',
  description: '',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const CardsNavigationWillAllLinks = () => {
  return <Component {...mockProps} />;
};

export const CardsNavigationWithSomeLinks = () => {
  return <Component {...mockProps} sections={[{ apps: mockProps.sections[1].apps }]} />;
};

export const CardsNavigationWithHiddenLinks = () => {
  return <Component {...mockProps} hideLinksTo={['api_keys']} />;
};
