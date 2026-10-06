/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterEntry, ProjectPickerState } from './reducers';
export declare const hasActiveFilterExpressions: (
  filterExpressions: Map<string, FilterEntry>
) => boolean;
/**
 * Computes the list of project IDs that are currently displayed in the list based on the available projects and filter expressions provided by the user.
 */
export declare const computeVisibleProjectIds: (
  state: Pick<ProjectPickerState, 'availableProjects' | 'filterExpressions' | 'filteredProjectIds'>
) => string[];
export declare const getIncludedVisibleProjectIds: (
  state: Pick<ProjectPickerState, 'visibleProjectIds' | 'selectedProjectIds'>
) => string[];
/**
 * Computes the list of project ids that are currently enabled from the visible list.
 * It factors in the user defined exclusion overrides.
 */
export declare const computeSelectedProjects: (
  state: Pick<
    ProjectPickerState,
    'filteredProjectIds' | 'availableProjects' | 'excludedOverrides' | 'filterExpressions'
  >
) => string[];
/**
 * The filters chips/menus should read: the pending proposal's filters if one exists, otherwise
 * the committed ones. Lets edits appear immediately in the UI, ahead of server confirmation.
 */
export declare const computeDisplayedFilterExpressions: (
  state: Pick<ProjectPickerState, 'proposedFilters' | 'filterExpressions'>
) => Map<string, FilterEntry>;
export declare const computeIsFilterProposalPending: (
  state: Pick<ProjectPickerState, 'proposedFilters'>
) => boolean;
/**
 * Whether the committed state is semantically equivalent to the space default routing.
 *
 * Compares the parsed default's filters and exclusions against the committed state rather
 * than comparing routing strings: re-encoding is not string-stable — under the `snapshot`
 * strategy the encoder always appends an explicit `_id:…` enumeration, and even `dynamic`
 * defaults need not re-encode byte-for-byte (e.g. `'_alias:origin AND _id:*'` collapses to
 * `'_alias:origin'`) — so string equality would report `false` forever after a revert.
 */
export declare const computeIsUsingSpaceDefaults: (
  state: Pick<
    ProjectPickerState,
    | 'defaultProjectRouting'
    | 'availableProjects'
    | 'originProjectId'
    | 'filterExpressions'
    | 'excludedOverrides'
  >
) => boolean;
export declare const computeCurrentProjectRouting: (
  state: ProjectPickerState
) => string | undefined;
/**
 * Derivatives are computed values that are derived from the state of the project picker.
 * Order is important here, when derivations depend on other derivations, they should be computed after the dependent derivations.
 */
export declare const projectPickerDerivatives: [
  {
    readonly key: 'displayedFilterExpressions';
    readonly compute: (state: ProjectPickerState) => Map<string, FilterEntry>;
  },
  {
    readonly key: 'isFilterProposalPending';
    readonly compute: (state: ProjectPickerState) => boolean;
  },
  {
    readonly key: 'visibleProjectIds';
    readonly compute: (state: ProjectPickerState) => string[];
  },
  {
    readonly key: 'selectedProjectIds';
    readonly compute: (state: ProjectPickerState) => string[];
  },
  {
    readonly key: 'filteringDimensions';
    readonly compute: (state: ProjectPickerState) => string[];
  },
  {
    readonly key: 'currentProjectRouting';
    readonly compute: (state: ProjectPickerState) => string | undefined;
  },
  {
    readonly key: 'isUsingSpaceDefaults';
    readonly compute: (state: ProjectPickerState) => boolean;
  }
];
