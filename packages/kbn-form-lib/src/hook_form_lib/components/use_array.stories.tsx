/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { ComponentMeta } from '@storybook/react';

import { STORYBOOK_SECTION } from '../constants';
import { UseArray } from './use_array';
import { useArrayStories } from './__stories__';

const { UseArrayBasic, UseArrayReorder, UseArrayComplex, UseArrayDynamicData } = useArrayStories;

export default {
  component: UseArray,
  title: `${STORYBOOK_SECTION}/UseArray`,
  decorators: [
    (Story) => {
      return (
        <div style={{ maxWidth: '600px' }}>
          <Story />
        </div>
      );
    },
  ],
} as ComponentMeta<typeof UseArray>;

export { UseArrayBasic, UseArrayReorder, UseArrayComplex, UseArrayDynamicData };
