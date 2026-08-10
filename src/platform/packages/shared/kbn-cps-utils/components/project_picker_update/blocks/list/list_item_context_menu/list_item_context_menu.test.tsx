/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CPSProject } from '../../../../../types';
import type { useProjectPickerActions } from '../../../state';
import type { ProjectPickerState } from '../../../state/reducers';
import { getProjectPickerListContextMenuConfig } from './list_item_context_menu';

const createProject = (id: string): CPSProject => ({
  _id: id,
  _alias: id,
  _type: 'security',
  _organisation: 'org',
  _region: 'us-east-1',
  _csp: 'AWS',
});

const createMenuState = (overrides: Partial<ProjectPickerState> = {}): ProjectPickerState => ({
  filterExpressions: new Map(),
  filteringDimensions: [],
  availableProjects: new Map([
    ['p1', createProject('p1')],
    ['p2', createProject('p2')],
  ]),
  excludedOverrides: [],
  filteredProjectIds: ['p1', 'p2'],
  visibleProjectIds: ['p1', 'p2'],
  selectedProjects: ['p1', 'p2'],
  ...overrides,
});

describe('getProjectPickerListContextMenuConfig', () => {
  const actions = {
    includeOnlyProvidedProjectId: jest.fn(),
    excludeOnlyProvidedProjectId: jest.fn(),
  } as unknown as ReturnType<typeof useProjectPickerActions>;

  const [includeOnlyItem, excludeOnlyItem] = getProjectPickerListContextMenuConfig(actions);
  const anchor = createProject('p1');

  const getIncludeOnlyDisabled = (state: ProjectPickerState, activeProject: CPSProject = anchor) =>
    includeOnlyItem.isDisabled({ activeProject, state });

  const getExcludeOnlyDisabled = (state: ProjectPickerState, activeProject: CPSProject = anchor) =>
    excludeOnlyItem.isDisabled({ activeProject, state });

  describe('Include only this project', () => {
    it('is enabled when no projects are excluded', () => {
      expect(getIncludeOnlyDisabled(createMenuState())).toBe(false);
    });

    it('is enabled when the anchor is excluded', () => {
      expect(
        getIncludeOnlyDisabled(
          createMenuState({
            excludedOverrides: ['p1'],
          })
        )
      ).toBe(false);
    });

    it('is disabled when all other visible projects are already excluded', () => {
      expect(
        getIncludeOnlyDisabled(
          createMenuState({
            excludedOverrides: ['p2'],
          })
        )
      ).toBe(true);
    });

    it('is enabled when the anchor is included and not all other visible projects are excluded', () => {
      expect(
        getIncludeOnlyDisabled(
          createMenuState({
            availableProjects: new Map([
              ['p1', createProject('p1')],
              ['p2', createProject('p2')],
              ['p3', createProject('p3')],
            ]),
            excludedOverrides: ['p2'],
          })
        )
      ).toBe(false);
    });
  });

  describe('Exclude only this project', () => {
    it('is enabled when the anchor is included', () => {
      expect(getExcludeOnlyDisabled(createMenuState())).toBe(false);
    });

    it('is disabled when only the anchor is excluded', () => {
      expect(
        getExcludeOnlyDisabled(
          createMenuState({
            excludedOverrides: ['p1'],
          })
        )
      ).toBe(true);
    });

    it('is enabled when the anchor is included and other projects are excluded', () => {
      expect(
        getExcludeOnlyDisabled(
          createMenuState({
            excludedOverrides: ['p2'],
          })
        )
      ).toBe(false);
    });

    it('is enabled when the anchor and other visible projects are excluded', () => {
      expect(
        getExcludeOnlyDisabled(
          createMenuState({
            excludedOverrides: ['p1', 'p2'],
          })
        )
      ).toBe(false);
    });
  });
});
