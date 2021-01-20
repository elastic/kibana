/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { OptInMessage } from './opt_in_message';

describe('OptInMessage', () => {
  it('renders as expected', () => {
    expect(shallowWithIntl(<OptInMessage />)).toMatchSnapshot();
  });
});
