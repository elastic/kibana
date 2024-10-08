/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertLifecycleStatusBadge } from '.';

describe('alertLifecycleStatusBadge', () => {
  it('should display the alert status correctly when active and not flapping', () => {
    const { getByText } = render(
      <AlertLifecycleStatusBadge alertStatus="active" flapping={false} />
    );
    expect(getByText('Active')).toBeTruthy();
  });

  it('should display the alert status correctly when active and flapping', () => {
    const { getByText } = render(
      <AlertLifecycleStatusBadge alertStatus="active" flapping={true} />
    );
    expect(getByText('Flapping')).toBeTruthy();
  });

  it('should display the alert status correctly when recovered and not flapping', () => {
    const { getByText } = render(
      <AlertLifecycleStatusBadge alertStatus="recovered" flapping={false} />
    );
    expect(getByText('Recovered')).toBeTruthy();
  });

  it('should prioritize recovered over flapping when recovered and flapping', () => {
    const { getByText } = render(
      <AlertLifecycleStatusBadge alertStatus="recovered" flapping={true} />
    );
    expect(getByText('Recovered')).toBeTruthy();
  });

  it('should display active alert status correctly is flapping is not defined', () => {
    const { getByText } = render(<AlertLifecycleStatusBadge alertStatus="active" />);
    expect(getByText('Active')).toBeTruthy();
  });

  it('should display recovered alert status correctly is flapping is not defined', () => {
    const { getByText } = render(<AlertLifecycleStatusBadge alertStatus="recovered" />);
    expect(getByText('Recovered')).toBeTruthy();
  });
});
