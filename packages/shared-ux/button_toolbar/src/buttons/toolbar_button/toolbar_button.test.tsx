/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { ToolbarButton } from './toolbar_button';

describe('<ToolbarButton />', () => {
  test('primary button is rendered', () => {
    const component = mountWithIntl(
      <ToolbarButton type="primary" label="Create chart" onClick={() => 'click'} />
    );
    expect(component.render()).toMatchSnapshot();
  });
});
