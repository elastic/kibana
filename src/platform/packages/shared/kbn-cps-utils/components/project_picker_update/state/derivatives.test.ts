/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CPSProject } from '../../../types';
import type { FilterEntry, ProjectPickerState } from './reducers';
import {
  applyFilterExpressions,
  computeSelectedProjects,
  computeVisibleProjectIds,
  projectPickerDerivatives,
} from './derivatives';

const createProject = (overrides: Partial<CPSProject> & Pick<CPSProject, '_id'>): CPSProject => ({
  _alias: 'alias',
  _type: 'security',
  _organisation: 'org',
  _region: 'us-east-1',
  ...overrides,
});

const createFilterExpressions = (
  entries: Array<[string, string, boolean?]>
): Map<string, FilterEntry> =>
  new Map(entries.map(([id, expression, enabled = true]) => [id, { expression, enabled }]));

const createState = (overrides: Partial<ProjectPickerState> = {}): ProjectPickerState => {
  const availableProjects = overrides.availableProjects ?? new Map<string, CPSProject>();

  return {
    filterExpressions: new Map(),
    filteringDimensions: [],
    availableProjects,
    includedOverrides: [],
    excludedOverrides: [],
    filteredProjectIds: [],
    visibleProjectIds: [],
    selectedProjects: [],
    ...overrides,
  };
};

describe('applyFilterExpressions', () => {
  it('returns an empty list when no filter expressions are set', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1' })],
      ['p2', createProject({ _id: 'p2', _type: 'observability' })],
    ]);

    expect(applyFilterExpressions(availableProjects, new Map())).toEqual([]);
  });

  it('filters projects by tag name and value', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1', _type: 'security' })],
      ['p2', createProject({ _id: 'p2', _type: 'observability' })],
    ]);

    expect(
      applyFilterExpressions(
        availableProjects,
        createFilterExpressions([['f1', 'is:_type:security']])
      )
    ).toEqual(['p1']);
  });

  it('excludes projects when the filter operator is negated', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1', _type: 'security' })],
      ['p2', createProject({ _id: 'p2', _type: 'observability' })],
    ]);

    expect(
      applyFilterExpressions(
        availableProjects,
        createFilterExpressions([['f1', 'not:_type:security']])
      )
    ).toEqual(['p2']);
  });

  it('skips disabled filter expressions', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1', _type: 'security' })],
      ['p2', createProject({ _id: 'p2', _type: 'observability' })],
    ]);

    expect(
      applyFilterExpressions(
        availableProjects,
        createFilterExpressions([['f1', 'is:_type:security', false]])
      )
    ).toEqual(['p1', 'p2']);
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
          filteredProjectIds: ['p2'],
        })
      )
    ).toEqual(['p2']);
  });

  it('applies include and exclude overrides on top of the filtered base', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1' })],
      ['p2', createProject({ _id: 'p2' })],
      ['p3', createProject({ _id: 'p3' })],
    ]);

    expect(
      computeSelectedProjects(
        createState({
          availableProjects,
          filteredProjectIds: ['p1', 'p2'],
          excludedOverrides: ['p2'],
          includedOverrides: ['p3'],
        })
      )
    ).toEqual(['p1', 'p3']);
  });

  it('ignores override ids that are not in available projects', () => {
    const availableProjects = new Map([['p1', createProject({ _id: 'p1' })]]);

    expect(
      computeSelectedProjects(
        createState({
          availableProjects,
          includedOverrides: ['missing'],
        })
      )
    ).toEqual(['p1']);
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
          filterExpressions: createFilterExpressions([['f1', 'is:_type:security']]),
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
          filterExpressions: createFilterExpressions([['f1', 'is:_type:missing']]),
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
          filterExpressions: createFilterExpressions([['f1', 'is:_type:security', false]]),
          filteredProjectIds: ['p1', 'p2'],
        })
      )
    ).toEqual(['p1', 'p2']);
  });
});

describe('projectPickerDerivatives', () => {
  it('computes filteredProjectIds before selectedProjects', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1', _type: 'security' })],
      ['p2', createProject({ _id: 'p2', _type: 'observability' })],
    ]);

    const state = createState({
      availableProjects,
      filterExpressions: createFilterExpressions([['f1', 'is:_type:security']]),
    });

    const afterFiltered = {
      ...state,
      filteredProjectIds: projectPickerDerivatives[0].compute(state),
    };

    expect(afterFiltered.filteredProjectIds).toEqual(['p1']);
    expect(projectPickerDerivatives[2].compute(afterFiltered)).toEqual(['p1']);
  });

  it('computes visibleProjectIds from active filters', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1', _type: 'security' })],
      ['p2', createProject({ _id: 'p2', _type: 'observability' })],
    ]);

    const state = createState({
      availableProjects,
      filterExpressions: createFilterExpressions([['f1', 'is:_type:security']]),
    });

    const afterFiltered = {
      ...state,
      filteredProjectIds: projectPickerDerivatives[0].compute(state),
    };

    expect(projectPickerDerivatives[1].compute(afterFiltered)).toEqual(['p1']);
  });
});
