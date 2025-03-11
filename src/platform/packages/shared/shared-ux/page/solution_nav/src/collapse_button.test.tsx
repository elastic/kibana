/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { SolutionNavCollapseButton } from './collapse_button';

describe('SolutionNavCollapseButton', () => {
  test('renders', () => {
    render(<SolutionNavCollapseButton isCollapsed={false} />);
    screen.getByTitle('Collapse side navigation');
  });

  test('isCollapsed', () => {
    render(<SolutionNavCollapseButton isCollapsed={true} />);
    screen.getByTitle('Open side navigation');
  });
});
