/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Template } from '@kbn/workflows-library';
import {
  EMPTY_STATE_CATEGORY_TILE_COUNT,
  categoryLibrarySearch,
  selectCategoryTiles,
  summarizeCategoryTile,
} from './category_tiles';

const template = (
  category: string,
  solutions?: string[],
  categories: string[] = [category]
): Template =>
  ({
    slug: category,
    name: category,
    description: '',
    categories,
    solutions,
  }) as Template;

describe('selectCategoryTiles', () => {
  const catalog = [
    template('case-management', ['security']),
    template('response', ['security']),
    template('threat-intel', ['security']),
    template('monitoring', ['observability']),
    template('search'),
  ];

  it('returns the configured security tiles that have templates', () => {
    expect(EMPTY_STATE_CATEGORY_TILE_COUNT).toBe(3);
    expect(selectCategoryTiles(catalog, 'security').map((tile) => tile.category)).toEqual([
      'case-management',
      'response',
      'threat-intel',
    ]);
  });

  it('drops a category with no templates', () => {
    const tiles = selectCategoryTiles(
      catalog.filter((item) => !item.categories.includes('response')),
      'security'
    );
    expect(tiles.map((tile) => tile.category)).toEqual(['case-management', 'threat-intel']);
  });

  it('returns one tile per solution when no solution is active', () => {
    const tiles = selectCategoryTiles(catalog, undefined);
    expect(tiles.map((tile) => tile.category)).toEqual([
      'case-management',
      'monitoring',
      'search',
    ]);
    expect(categoryLibrarySearch(tiles[0], undefined)).toBe(
      '?category=case-management&solution=security'
    );
  });

  it('omits the solution param when a solution nav is active', () => {
    const [tile] = selectCategoryTiles(catalog, 'security');
    expect(categoryLibrarySearch(tile, 'security')).toBe('?category=case-management');
  });

  it('returns nothing for a solution that has no configured tiles', () => {
    expect(selectCategoryTiles(catalog, 'workplace')).toEqual([]);
  });
});

describe('summarizeCategoryTile', () => {
  const tile = selectCategoryTiles(
    [template('case-management', ['security'])],
    'security'
  )[0];

  it('counts the templates the filtered library would show', () => {
    const catalog = [
      template('one', ['security'], ['case-management', 'ai-agent']),
      template('two', ['security'], ['case-management', 'ai-agent', 'hunting']),
      template('three', ['security'], ['case-management', 'response']),
      template('other', ['observability'], ['case-management', 'monitoring']),
    ];

    expect(summarizeCategoryTile(catalog, tile).templateCount).toBe(3);
  });

  it('shows the two most common tags and counts the rest', () => {
    const catalog = [
      template('one', ['security'], ['case-management', 'ai-agent']),
      template('two', ['security'], ['case-management', 'ai-agent', 'hunting']),
      template('three', ['security'], ['case-management', 'response']),
    ];

    expect(summarizeCategoryTile(catalog, tile)).toEqual({
      templateCount: 3,
      visibleTags: ['case-management', 'ai-agent'],
      overflowTagCount: 2,
    });
  });
});
