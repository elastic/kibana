/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import * as jest from 'jest-mock';
import { addDecorator } from '@storybook/react';

import { Title, Subtitle, Description, Primary, Stories } from '@storybook/addon-docs/blocks';

import { servicesContextDecorator } from './decorator';

addDecorator(servicesContextDecorator);

// @ts-ignore
window.jest = jest;

export const parameters = {
  docs: {
    page: () => (
      <>
        <Title />
        <Subtitle />
        <Description />
        <Primary />
        <Stories />
      </>
    ),
  },
};
