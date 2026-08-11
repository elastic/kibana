/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CPSProject, ProjectsData } from '../../../types';
import type { FilterEntry, ProjectPickerState } from './reducers';
import {
  buildPreviewFilterExpressions,
  collectProjectIdsFromProjectsData,
  computeSelectedProjects,
  computeVisibleProjectIds,
  getEnabledFilterExpressions,
  intersectServerMatchIds,
  isDuplicateFilterExpressionDraft,
  projectPickerDerivatives,
} from './derivatives';
import { applyStoreDerivatives } from './store';
import {
  FilterOperator,
  getFilterExpressionLookupKey,
  type FilterExpressionValue,
} from '../utils/filter_input_codec';
import { encodeFilterOnlyRouting } from '../utils/project_routing_codec';

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

const createState = (overrides: Partial<ProjectPickerState> = {}): ProjectPickerState => {
  const availableProjects = overrides.availableProjects ?? new Map<string, CPSProject>();

  return {
    originProjectId: 'origin',
    defaultProjectRouting: '',
    projectRoutingStrategy: 'dynamic',
    filterExpressions: new Map(),
    filteringDimensions: [],
    availableProjects,
    excludedOverrides: [],
    filteredProjectIds: [],
    isFilterSearchLoading: false,
    filterSearchError: null,
    visibleProjectIds: [],
    selectedProjects: [],
    currentProjectRouting: '',
    isUsingSpaceDefaults: false,
    ...overrides,
    defaultProjectRouting: overrides.defaultProjectRouting ?? '_alias:*',
    hasUserModifiedRouting: overrides.hasUserModifiedRouting ?? false,
    originProjectId: overrides.originProjectId,
  };
};

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

describe('computeSelectedProjects', () => {
  it('selects all available projects when there are no filters or overrides', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1' })],
      ['p2', createProject({ _id: 'p2' })],
    ]);

    expect(
      computeSelectedProjects(
        createState({
          availableProjects,
          filteredProjectIds: [],
        })
      )
    ).toEqual(['p1', 'p2']);
  });

  it('uses filtered projects as the base when filters are active', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1' })],
      ['p2', createProject({ _id: 'p2' })],
    ]);

    expect(
      computeSelectedProjects(
        createState({
          availableProjects,
          filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
          filteredProjectIds: ['p2'],
        })
      )
    ).toEqual(['p2']);
  });

  it('applies exclude overrides on top of the filtered base', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1' })],
      ['p2', createProject({ _id: 'p2' })],
      ['p3', createProject({ _id: 'p3' })],
    ]);

    expect(
      computeSelectedProjects(
        createState({
          availableProjects,
          filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
          filteredProjectIds: ['p1', 'p2'],
          excludedOverrides: ['p2'],
        })
      )
    ).toEqual(['p1']);
  });

  it('does not select projects outside the active filter base', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1' })],
      ['p2', createProject({ _id: 'p2' })],
      ['p3', createProject({ _id: 'p3' })],
    ]);

    expect(
      computeSelectedProjects(
        createState({
          availableProjects,
          filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
          filteredProjectIds: ['p1'],
          excludedOverrides: [],
        })
      )
    ).toEqual(['p1']);
  });

  it('selects no projects when active filters match no projects, even though filteredProjectIds is empty', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1', _type: 'security' })],
      ['p2', createProject({ _id: 'p2', _type: 'observability' })],
    ]);

    expect(
      computeSelectedProjects(
        createState({
          availableProjects,
          filterExpressions: createFilterExpressions([
            [{ operator: FilterOperator.EQUALS, tagName: '_type', tagValue: 'missing' }],
          ]),
          filteredProjectIds: [],
        })
      )
    ).toEqual([]);
  });
});

describe('computeVisibleProjectIds', () => {
  it('returns all available project ids when there are no active filters', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1' })],
      ['p2', createProject({ _id: 'p2' })],
    ]);

    expect(
      computeVisibleProjectIds(
        createState({
          availableProjects,
          filterExpressions: new Map(),
          filteredProjectIds: [],
        })
      )
    ).toEqual(['p1', 'p2']);
  });

  it('returns filtered project ids when active filters exist', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1', _type: 'security' })],
      ['p2', createProject({ _id: 'p2', _type: 'observability' })],
    ]);

    expect(
      computeVisibleProjectIds(
        createState({
          availableProjects,
          filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
          filteredProjectIds: ['p1'],
        })
      )
    ).toEqual(['p1']);
  });

  it('returns an empty list when active filters match no projects', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1', _type: 'security' })],
      ['p2', createProject({ _id: 'p2', _type: 'observability' })],
    ]);

    expect(
      computeVisibleProjectIds(
        createState({
          availableProjects,
          filterExpressions: createFilterExpressions([
            [{ operator: FilterOperator.EQUALS, tagName: '_type', tagValue: 'missing' }],
          ]),
          filteredProjectIds: [],
        })
      )
    ).toEqual([]);
  });

  it('returns all available project ids when all filter expressions are disabled', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1', _type: 'security' })],
      ['p2', createProject({ _id: 'p2', _type: 'observability' })],
    ]);

    expect(
      computeVisibleProjectIds(
        createState({
          availableProjects,
          filterExpressions: createFilterExpressions([[typeSecurityExpression, false]]),
          filteredProjectIds: ['p1', 'p2'],
        })
      )
    ).toEqual(['p1', 'p2']);
  });
});

describe('projectPickerDerivatives', () => {
  it('excludes _id from filteringDimensions', () => {
    const availableProjects = new Map([['p1', createProject({ _id: 'p1', _type: 'security' })]]);

    const derivedState = applyStoreDerivatives(createState({ availableProjects }), [
      ...projectPickerDerivatives,
    ]);

    expect(derivedState.filteringDimensions).not.toContain('_id');
    expect(derivedState.filteringDimensions).toContain('_type');
  });

  it('computes selectedProjects from filteredProjectIds when filters are active', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1', _type: 'security' })],
      ['p2', createProject({ _id: 'p2', _type: 'observability' })],
    ]);

    const state = createState({
      availableProjects,
      filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
      filteredProjectIds: ['p1'],
    });

    const derivedState = applyStoreDerivatives(state, [...projectPickerDerivatives]);

    expect(derivedState.visibleProjectIds).toEqual(['p1']);
    expect(derivedState.selectedProjects).toEqual(['p1']);
  });

  it('computes currentProjectRouting from filters and dynamic exclusions', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1', _type: 'security' })],
      ['p2', createProject({ _id: 'p2', _type: 'observability' })],
    ]);

    const derivedState = applyStoreDerivatives(
      createState({
        availableProjects,
        defaultProjectRouting: '_type:security AND _id:* AND NOT _id:p2',
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        filteredProjectIds: ['p1', 'p2'],
        excludedOverrides: ['p2'],
      }),
      [...projectPickerDerivatives]
    );

    expect(derivedState.currentProjectRouting).toBe('_type:security AND _id:* AND NOT _id:p2');
    expect(derivedState.isUsingSpaceDefaults).toBe(true);
  });

  it('computes isUsingSpaceDefaults as false when routing diverges from the default', () => {
    const derivedState = applyStoreDerivatives(
      createState({
        defaultProjectRouting: '_type:security',
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        filteredProjectIds: ['p1'],
        excludedOverrides: ['p2'],
      }),
      [...projectPickerDerivatives]
    );

    expect(derivedState.isUsingSpaceDefaults).toBe(false);
  });
});
