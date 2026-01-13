/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MenuItem } from '../../types';
import type { IconType } from '@elastic/eui';

import { haveSameHeightSignature } from './have_same_height_signature';

const createMenuItems = (labels: string[]): MenuItem[] =>
  labels.map((label, index) => ({
    id: `item-${index}`,
    label,
    href: `/${label}`,
    iconType: 'empty' as IconType,
  }));

describe('haveSameHeightSignature', () => {
  it('returns true when the references are identical', () => {
    const items = createMenuItems(['A', 'B']);

    expect(haveSameHeightSignature(items, items)).toBe(true);
  });

  it('returns true when the labels are equal', () => {
    const prev = createMenuItems(['Dashboards', 'Discover']);
    const next = createMenuItems(['Dashboards', 'Discover']);

    expect(haveSameHeightSignature(prev, next)).toBe(true);
  });

  it('returns false when the item count differs', () => {
    const prev = createMenuItems(['A', 'B']);
    const next = createMenuItems(['A']);

    expect(haveSameHeightSignature(prev, next)).toBe(false);
  });

  it('returns false when any label changes', () => {
    const prev = createMenuItems(['Dashboards', 'Discover']);
    const next = createMenuItems(['Dashboards', 'Analytics']);

    expect(haveSameHeightSignature(prev, next)).toBe(false);
  });
});
