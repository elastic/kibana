/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { LockedItem } from './locked_item';
import type { NavigationItemInfo } from '../types';

describe('LockedItem', () => {
  const item: NavigationItemInfo = {
    id: 'home',
    title: 'Home',
    hidden: false,
    locked: true,
    icon: 'home',
  };

  it('should render the item title', () => {
    renderWithI18n(<LockedItem item={item} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('should render a disabled switch', () => {
    renderWithI18n(<LockedItem item={item} />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeDisabled();
  });

  it('should render the lock icon', () => {
    const { container } = renderWithI18n(<LockedItem item={item} />);
    expect(container.querySelector('[data-euiicon-type="lock"]')).toBeInTheDocument();
  });

  it('should render the item icon when provided', () => {
    const { container } = renderWithI18n(<LockedItem item={item} />);
    expect(container.querySelector('[data-euiicon-type="home"]')).toBeInTheDocument();
  });

  it('should not render the item icon when not provided', () => {
    const itemWithoutIcon: NavigationItemInfo = { ...item, icon: undefined };
    const { container } = renderWithI18n(<LockedItem item={itemWithoutIcon} />);
    expect(container.querySelector('[data-euiicon-type="home"]')).not.toBeInTheDocument();
  });
});
