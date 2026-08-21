/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CPSProject, ProjectsData } from '../../../types';
import type { FilterEntry } from '../state/reducers';
import {
  buildPreviewFilterExpressions,
  collectProjectIdsFromProjectsData,
  getEnabledFilterExpressions,
  intersectServerMatchIds,
  isDuplicateFilterExpressionDraft,
} from './state_utils';
import {
  FilterOperator,
  getFilterExpressionLookupKey,
  type FilterExpressionValue,
} from './filter_input_codec';
import { encodeFilterOnlyRouting } from './project_routing_codec';

const typeSecurityExpression = {
  operator: FilterOperator.EQUALS,
  tagName: '_type',
  tagValue: 'security',
} as const;

const typeSecurityKey = getFilterExpressionLookupKey(typeSecurityExpression);

const createProject = (overrides: Partial<CPSProject> & Pick<CPSProject, '_id'>): CPSProject => ({
  _alias: 'alias',
  _type: 'security',
  _organisation: 'org',
  _region: 'us-east-1',
  ...overrides,
});

const createFilterExpressions = (
  entries: Array<[FilterExpressionValue, boolean?]>
): Map<string, FilterEntry> =>
  new Map(
    entries.map(([expression, enabled = true]) => [
      getFilterExpressionLookupKey(expression),
      { expression, enabled },
    ])
  );

describe('collectProjectIdsFromProjectsData', () => {
  it('returns an empty list for null data', () => {
    expect(collectProjectIdsFromProjectsData(null)).toEqual([]);
  });

  it('collects origin and linked project ids', () => {
    const data: ProjectsData = {
      origin: createProject({ _id: 'origin' }),
      linkedProjects: [createProject({ _id: 'linked1' }), createProject({ _id: 'linked2' })],
    };

    expect(collectProjectIdsFromProjectsData(data)).toEqual(['origin', 'linked1', 'linked2']);
  });
});

describe('intersectServerMatchIds', () => {
  it('keeps only ids present in the available projects catalog', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1' })],
      ['p2', createProject({ _id: 'p2' })],
    ]);

    expect(intersectServerMatchIds(availableProjects, ['p1', 'unknown', 'p2'])).toEqual([
      'p1',
      'p2',
    ]);
  });

  it('returns an empty list when nothing intersects', () => {
    const availableProjects = new Map([['p1', createProject({ _id: 'p1' })]]);

    expect(intersectServerMatchIds(availableProjects, ['other'])).toEqual([]);
  });
});

describe('buildPreviewFilterExpressions', () => {
  it('returns null when the draft filter is incomplete', () => {
    expect(
      buildPreviewFilterExpressions(new Map(), {
        operator: FilterOperator.EQUALS,
        tagName: '_type',
      })
    ).toBeNull();
  });

  it('adds a preview entry for a new draft filter', () => {
    const preview = buildPreviewFilterExpressions(new Map(), typeSecurityExpression);

    expect(preview).not.toBeNull();
    expect(getEnabledFilterExpressions(preview!)).toEqual([typeSecurityExpression]);
  });

  it('replaces an existing filter when editing by filterId', () => {
    const existing = createFilterExpressions([[typeSecurityExpression]]);
    const draft = {
      operator: FilterOperator.EQUALS,
      tagName: '_type',
      tagValue: 'observability',
    } as const;

    const preview = buildPreviewFilterExpressions(existing, draft, typeSecurityKey);

    expect(getEnabledFilterExpressions(preview!)).toEqual([draft]);
    expect(encodeFilterOnlyRouting(getEnabledFilterExpressions(preview!))).toBe(
      '_type:observability'
    );
  });
});

describe('isDuplicateFilterExpressionDraft', () => {
  it('returns true when creating a filter that already exists', () => {
    const filters = createFilterExpressions([[typeSecurityExpression]]);

    expect(isDuplicateFilterExpressionDraft(filters, typeSecurityExpression)).toBe(true);
  });

  it('returns true when creating a filter that exists but is disabled', () => {
    const filters = createFilterExpressions([[typeSecurityExpression, false]]);

    expect(isDuplicateFilterExpressionDraft(filters, typeSecurityExpression)).toBe(true);
  });

  it('returns false when editing the same filter expression', () => {
    const filters = createFilterExpressions([[typeSecurityExpression]]);

    expect(isDuplicateFilterExpressionDraft(filters, typeSecurityExpression, typeSecurityKey)).toBe(
      false
    );
  });

  it('returns true when editing to match another existing filter', () => {
    const observabilityExpression = {
      operator: FilterOperator.EQUALS,
      tagName: '_type',
      tagValue: 'observability',
    } as const;

    const filters = createFilterExpressions([[typeSecurityExpression], [observabilityExpression]]);

    expect(
      isDuplicateFilterExpressionDraft(filters, observabilityExpression, typeSecurityKey)
    ).toBe(true);
  });
});
