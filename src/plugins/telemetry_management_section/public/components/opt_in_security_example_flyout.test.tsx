/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { OptInSecurityExampleFlyout } from './opt_in_security_example_flyout';

describe('security flyout renders as expected', () => {
  it('renders as expected', () => {
    expect(shallowWithIntl(<OptInSecurityExampleFlyout onClose={jest.fn()} />)).toMatchSnapshot();
  });
});
