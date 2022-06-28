/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { addDecorator } from '@storybook/react';
import { Title, Subtitle, Description, Primary, Stories } from '@storybook/addon-docs/blocks';

import { servicesContextDecorator } from './decorator';

addDecorator(servicesContextDecorator);

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
