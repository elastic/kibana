/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { IconButtonGroup } from './icon_button_group';

describe('<IconButtonGroup />', () => {
  test('is rendered', () => {
    const component = mountWithIntl(
      <IconButtonGroup
        legend="Legend"
        buttons={[
          {
            label: 'Text',
            onClick: jest.fn(),
            iconType: 'visText',
          },
        ]}
      />
    );

    expect(component.render()).toMatchSnapshot();
  });
});
