/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MenuItem, MenuItemGroup } from '../types';
import { selectFeaturedVisualizationActions } from './select_featured_items';

const makeItem = (overrides: Partial<MenuItem> & { id: string }): MenuItem => ({
  name: overrides.id,
  icon: 'empty',
  onClick: jest.fn(),
  order: 0,
  ...overrides,
});

const makeGroup = (overrides: Partial<MenuItemGroup> & { id: string }): MenuItemGroup => ({
  title: overrides.id,
  order: 0,
  items: [],
  ...overrides,
});

describe('selectFeaturedVisualizationActions', () => {
  it('returns both items when present in a single group', () => {
    const lens = makeItem({ id: 'addLensPanelAction' });
    const esql = makeItem({ id: 'ACTION_CREATE_ESQL_CHART' });
    const other = makeItem({ id: 'somethingElse' });
    const groups = [makeGroup({ id: 'viz', items: [lens, esql, other] })];

    const result = selectFeaturedVisualizationActions(groups);

    expect(result.lens).toBe(lens);
    expect(result.esql).toBe(esql);
  });

  it('returns both items when spread across groups', () => {
    const lens = makeItem({ id: 'addLensPanelAction' });
    const esql = makeItem({ id: 'ACTION_CREATE_ESQL_CHART' });
    const groups = [makeGroup({ id: 'a', items: [lens] }), makeGroup({ id: 'b', items: [esql] })];

    const result = selectFeaturedVisualizationActions(groups);

    expect(result.lens).toBe(lens);
    expect(result.esql).toBe(esql);
  });

  it('returns undefined for missing items', () => {
    const other = makeItem({ id: 'maps' });
    const groups = [makeGroup({ id: 'viz', items: [other] })];

    const result = selectFeaturedVisualizationActions(groups);

    expect(result.lens).toBeUndefined();
    expect(result.esql).toBeUndefined();
  });

  it('returns lens but not esql when only lens is present', () => {
    const lens = makeItem({ id: 'addLensPanelAction' });
    const groups = [makeGroup({ id: 'viz', items: [lens] })];

    const result = selectFeaturedVisualizationActions(groups);

    expect(result.lens).toBe(lens);
    expect(result.esql).toBeUndefined();
  });

  it('returns empty results for empty groups', () => {
    const result = selectFeaturedVisualizationActions([]);

    expect(result.lens).toBeUndefined();
    expect(result.esql).toBeUndefined();
  });

  it('does not mutate the input groups', () => {
    const lens = makeItem({ id: 'addLensPanelAction' });
    const esql = makeItem({ id: 'ACTION_CREATE_ESQL_CHART' });
    const other = makeItem({ id: 'maps' });
    const groups = [makeGroup({ id: 'viz', items: [lens, esql, other] })];

    const snapshot = JSON.stringify(groups);
    selectFeaturedVisualizationActions(groups);

    expect(JSON.stringify(groups)).toBe(snapshot);
  });
});
