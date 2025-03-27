/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { Duration } from '.';

describe('Duration', () => {
  let wrapper: ReactWrapper;
  const defaultProps = {
    duration: 100,
  };

  beforeEach(async () => {
    wrapper = mount(<Duration {...defaultProps} />);
  });

  it('dumb temporary test', () => {
    expect(true).toBeTruthy();
  });
});
