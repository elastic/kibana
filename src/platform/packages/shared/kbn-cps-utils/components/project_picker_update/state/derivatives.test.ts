/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PROJECT_ROUTING } from '@kbn/cps-common';
import type { CPSProject } from '../../../types';
import type { FilterEntry, ProjectPickerState } from './reducers';
import {
  computeIsUsingSpaceDefaults,
  computeSelectedProjects,
  computeVisibleProjectIds,
  projectPickerDerivatives,
} from './derivatives';
import { applyStoreDerivatives } from './store';
import {
  FilterOperator,
  getFilterExpressionLookupKey,
  type FilterExpressionValue,
} from '../utils/filter_input_codec';

const typeSecurityExpression = {
  operator: FilterOperator.EQUALS,
  tagName: '_type',
  tagValue: 'security',
} as const;

const aliasExistsExpression = {
  operator: FilterOperator.EXISTS,
  tagName: '_alias',
  tagValue: undefined,
} as const;

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
  const filterExpressions = overrides.filterExpressions ?? new Map();

  return {
    originProjectId: 'origin',
    defaultProjectRouting: '',
    projectRoutingStrategy: 'dynamic',
    hasUserModifiedRouting: false,
    filterExpressions,
    filteringDimensions: [],
    availableProjects,
    excludedOverrides: [],
    proposedFilters: null,
    filteredProjectIds: [],
    isFilterSearchLoading: false,
    filterSearchError: null,
    visibleProjectIds: [],
    selectedProjectIds: [],
    currentProjectRouting: '',
    isUsingSpaceDefaults: false,
    displayedFilterExpressions: filterExpressions,
    isFilterProposalPending: false,
    controlsState: 'enabled',
    ...overrides,
  };
};

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

describe('computeIsUsingSpaceDefaults', () => {
  const fourProjects = new Map(
    ['p1', 'p2', 'p3', 'p4'].map((id) => [id, createProject({ _id: id })])
  );

  it('is true when a snapshot-shaped default resolves to the committed exclusions, regardless of order', () => {
    expect(
      computeIsUsingSpaceDefaults(
        createState({
          availableProjects: fourProjects,
          defaultProjectRouting: '_id:p1 OR _id:p2',
          excludedOverrides: ['p4', 'p3'],
        })
      )
    ).toBe(true);
  });

  it('is false when the committed exclusions diverge from what the default resolves to', () => {
    expect(
      computeIsUsingSpaceDefaults(
        createState({
          availableProjects: fourProjects,
          defaultProjectRouting: '_id:p1 OR _id:p2',
          excludedOverrides: ['p3'],
        })
      )
    ).toBe(false);
  });

  it('is false when the committed filters diverge from the default filters', () => {
    expect(
      computeIsUsingSpaceDefaults(
        createState({
          availableProjects: fourProjects,
          defaultProjectRouting: '_type:security',
          filterExpressions: createFilterExpressions([
            [{ operator: FilterOperator.EQUALS, tagName: '_type', tagValue: 'observability' }],
          ]),
        })
      )
    ).toBe(false);
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
    expect(derivedState.selectedProjectIds).toEqual(['p1']);
  });

  it('computes currentProjectRouting from filters and dynamic exclusions', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1', _type: 'security' })],
      ['p2', createProject({ _id: 'p2', _type: 'observability' })],
    ]);

    const derivedState = applyStoreDerivatives(
      createState({
        availableProjects,
        defaultProjectRouting: '_type:security AND (_id:* AND NOT _id:p2)',
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        filteredProjectIds: ['p1', 'p2'],
        excludedOverrides: ['p2'],
      }),
      [...projectPickerDerivatives]
    );

    expect(derivedState.currentProjectRouting).toBe('_type:security AND (_id:* AND NOT _id:p2)');
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

  it('computes isUsingSpaceDefaults as true under the snapshot strategy despite the re-encoded routing differing from the default string', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1', _type: 'security' })],
      ['p2', createProject({ _id: 'p2', _type: 'security' })],
    ]);

    const derivedState = applyStoreDerivatives(
      createState({
        availableProjects,
        projectRoutingStrategy: 'snapshot',
        defaultProjectRouting: '_type:security',
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        filteredProjectIds: ['p1', 'p2'],
        excludedOverrides: [],
      }),
      [...projectPickerDerivatives]
    );

    // the snapshot encoder expands the selection into explicit _id clauses, so string
    // equality with the default can never hold — the semantic comparison must
    expect(derivedState.currentProjectRouting).toBe('_type:security AND (_id:p1 OR _id:p2)');
    expect(derivedState.isUsingSpaceDefaults).toBe(true);
  });

  it('emits PROJECT_ROUTING.ORIGIN for snapshot origin-only selection with exists `_alias`', () => {
    const availableProjects = new Map([
      ['origin', createProject({ _id: 'origin' })],
      ['p2', createProject({ _id: 'p2' })],
    ]);

    const derivedState = applyStoreDerivatives(
      createState({
        availableProjects,
        projectRoutingStrategy: 'snapshot',
        defaultProjectRouting: PROJECT_ROUTING.ORIGIN,
        filterExpressions: createFilterExpressions([[aliasExistsExpression]]),
        filteredProjectIds: ['origin', 'p2'],
        excludedOverrides: ['p2'],
      }),
      [...projectPickerDerivatives]
    );

    expect(derivedState.selectedProjectIds).toEqual(['origin']);
    expect(derivedState.currentProjectRouting).toBe(PROJECT_ROUTING.ORIGIN);
    expect(derivedState.isUsingSpaceDefaults).toBe(true);
  });

  it('emits `_id:origin` for snapshot origin-only selection with no filters', () => {
    const availableProjects = new Map([
      ['origin', createProject({ _id: 'origin' })],
      ['p2', createProject({ _id: 'p2' })],
    ]);

    const derivedState = applyStoreDerivatives(
      createState({
        availableProjects,
        projectRoutingStrategy: 'snapshot',
        excludedOverrides: ['p2'],
      }),
      [...projectPickerDerivatives]
    );

    expect(derivedState.selectedProjectIds).toEqual(['origin']);
    expect(derivedState.currentProjectRouting).toBe('_id:origin');
  });

  it('emits `_id:origin` when snapshot has only the origin project available and no filters', () => {
    const availableProjects = new Map([['origin', createProject({ _id: 'origin' })]]);

    const derivedState = applyStoreDerivatives(
      createState({
        availableProjects,
        projectRoutingStrategy: 'snapshot',
      }),
      [...projectPickerDerivatives]
    );

    expect(derivedState.selectedProjectIds).toEqual(['origin']);
    expect(derivedState.currentProjectRouting).toBe('_id:origin');
  });

  it('emits PROJECT_ROUTING.ORIGIN for dynamic origin-only selection with exists `_alias`', () => {
    const availableProjects = new Map([
      ['origin', createProject({ _id: 'origin' })],
      ['p2', createProject({ _id: 'p2' })],
    ]);

    const derivedState = applyStoreDerivatives(
      createState({
        availableProjects,
        projectRoutingStrategy: 'dynamic',
        filterExpressions: createFilterExpressions([[aliasExistsExpression]]),
        filteredProjectIds: ['origin', 'p2'],
        excludedOverrides: ['p2'],
      }),
      [...projectPickerDerivatives]
    );

    expect(derivedState.selectedProjectIds).toEqual(['origin']);
    expect(derivedState.currentProjectRouting).toBe(PROJECT_ROUTING.ORIGIN);
  });

  it('emits PROJECT_ROUTING.ALL for dynamic exists `_alias` with no exclusions', () => {
    const availableProjects = new Map([
      ['origin', createProject({ _id: 'origin' })],
      ['p2', createProject({ _id: 'p2' })],
    ]);

    const derivedState = applyStoreDerivatives(
      createState({
        availableProjects,
        projectRoutingStrategy: 'dynamic',
        defaultProjectRouting: PROJECT_ROUTING.ALL,
        filterExpressions: createFilterExpressions([[aliasExistsExpression]]),
        filteredProjectIds: ['origin', 'p2'],
        excludedOverrides: [],
      }),
      [...projectPickerDerivatives]
    );

    expect(derivedState.selectedProjectIds).toEqual(['origin', 'p2']);
    expect(derivedState.currentProjectRouting).toBe(PROJECT_ROUTING.ALL);
    expect(derivedState.isUsingSpaceDefaults).toBe(true);
  });

  it('keeps snapshot filter clauses instead of collapsing origin-only selection to ORIGIN', () => {
    const availableProjects = new Map([
      ['origin', createProject({ _id: 'origin', _type: 'security' })],
      ['p2', createProject({ _id: 'p2', _type: 'observability' })],
    ]);

    const derivedState = applyStoreDerivatives(
      createState({
        availableProjects,
        projectRoutingStrategy: 'snapshot',
        filterExpressions: createFilterExpressions([[typeSecurityExpression]]),
        filteredProjectIds: ['origin'],
      }),
      [...projectPickerDerivatives]
    );

    expect(derivedState.selectedProjectIds).toEqual(['origin']);
    expect(derivedState.currentProjectRouting).toBe('_type:security AND _id:origin');
  });

  it('encodes an explicit snapshot id when the origin project id is unknown', () => {
    const availableProjects = new Map([
      ['p1', createProject({ _id: 'p1' })],
      ['p2', createProject({ _id: 'p2' })],
    ]);

    const derivedState = applyStoreDerivatives(
      createState({
        availableProjects,
        originProjectId: undefined,
        projectRoutingStrategy: 'snapshot',
        excludedOverrides: ['p2'],
      }),
      [...projectPickerDerivatives]
    );

    expect(derivedState.selectedProjectIds).toEqual(['p1']);
    expect(derivedState.currentProjectRouting).toBe('_id:p1');
  });

  it('encodes dynamic origin-only selection as _id exclusions', () => {
    const availableProjects = new Map([
      ['origin', createProject({ _id: 'origin' })],
      ['p2', createProject({ _id: 'p2' })],
    ]);

    const derivedState = applyStoreDerivatives(
      createState({
        availableProjects,
        projectRoutingStrategy: 'dynamic',
        excludedOverrides: ['p2'],
      }),
      [...projectPickerDerivatives]
    );

    expect(derivedState.selectedProjectIds).toEqual(['origin']);
    expect(derivedState.currentProjectRouting).toBe('_id:* AND NOT _id:p2');
  });

  describe('displayedFilterExpressions / isFilterProposalPending', () => {
    it('reads the committed filters and reports no pending proposal when none exists', () => {
      const committed = createFilterExpressions([[typeSecurityExpression]]);

      const derivedState = applyStoreDerivatives(
        createState({ filterExpressions: committed, proposedFilters: null }),
        [...projectPickerDerivatives]
      );

      expect(derivedState.displayedFilterExpressions).toBe(committed);
      expect(derivedState.isFilterProposalPending).toBe(false);
    });

    it('prefers the proposed filters and reports a pending proposal while one exists', () => {
      const committed = createFilterExpressions([[typeSecurityExpression]]);
      const proposed = createFilterExpressions([]);

      const derivedState = applyStoreDerivatives(
        createState({
          filterExpressions: committed,
          proposedFilters: { filterExpressions: proposed, excludedOverrides: [] },
        }),
        [...projectPickerDerivatives]
      );

      expect(derivedState.displayedFilterExpressions).toBe(proposed);
      expect(derivedState.isFilterProposalPending).toBe(true);
    });

    it('leaves visibleProjectIds/selectedProjectIds keyed off the committed filters while a proposal is pending', () => {
      const availableProjects = new Map([
        ['p1', createProject({ _id: 'p1', _type: 'security' })],
        ['p2', createProject({ _id: 'p2', _type: 'observability' })],
      ]);
      const committed = createFilterExpressions([[typeSecurityExpression]]);
      const proposed = createFilterExpressions([]);

      const derivedState = applyStoreDerivatives(
        createState({
          availableProjects,
          filterExpressions: committed,
          filteredProjectIds: ['p1'],
          proposedFilters: { filterExpressions: proposed, excludedOverrides: [] },
        }),
        [...projectPickerDerivatives]
      );

      // still the pre-proposal list, since filterExpressions/filteredProjectIds are untouched
      // until the proposal is committed
      expect(derivedState.visibleProjectIds).toEqual(['p1']);
      expect(derivedState.selectedProjectIds).toEqual(['p1']);
    });
  });
});
