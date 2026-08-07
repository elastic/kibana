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
import {
  getProjectRoutingFromSelectedProjectIds,
  getSelectedProjectIdsFromProjectRouting,
} from './project_routing';

const originProject: CPSProject = {
  _id: 'origin-id',
  _alias: 'local_project',
  _type: 'security',
  _organisation: 'org',
};

const linkedProject: CPSProject = {
  _id: 'linked-id',
  _alias: 'linked_local_project',
  _type: 'security',
  _organisation: 'org',
};

const availableProjects = [originProject, linkedProject];
const originProjectId = originProject._id;

describe('project routing helpers', () => {
  describe('getSelectedProjectIdsFromProjectRouting', () => {
    it('selects all projects when routing is all projects', () => {
      expect(
        getSelectedProjectIdsFromProjectRouting({
          availableProjects,
          originProjectId,
          projectRouting: PROJECT_ROUTING.ALL,
        })
      ).toEqual(['origin-id', 'linked-id']);
    });

    it('selects the origin project for origin routing', () => {
      expect(
        getSelectedProjectIdsFromProjectRouting({
          availableProjects,
          originProjectId,
          projectRouting: PROJECT_ROUTING.ORIGIN,
        })
      ).toEqual(['origin-id']);
    });

    it('selects projects by alias expression', () => {
      expect(
        getSelectedProjectIdsFromProjectRouting({
          availableProjects,
          originProjectId,
          projectRouting: '_alias:(local_project OR linked_local_project)',
        })
      ).toEqual(['origin-id', 'linked-id']);
    });

    it('selects the origin project from the origin alias token', () => {
      expect(
        getSelectedProjectIdsFromProjectRouting({
          availableProjects,
          originProjectId,
          projectRouting: '_alias:(_origin OR linked_local_project)',
        })
      ).toEqual(['origin-id', 'linked-id']);
    });
  });

  describe('getProjectRoutingFromSelectedProjectIds', () => {
    it('uses all-projects routing when every project is selected', () => {
      expect(
        getProjectRoutingFromSelectedProjectIds({
          availableProjects,
          originProjectId,
          selectedProjectIds: ['origin-id', 'linked-id'],
        })
      ).toBe(PROJECT_ROUTING.ALL);
    });

    it('uses origin routing when only the origin project is selected', () => {
      expect(
        getProjectRoutingFromSelectedProjectIds({
          availableProjects,
          originProjectId,
          selectedProjectIds: ['origin-id'],
        })
      ).toBe(PROJECT_ROUTING.ORIGIN);
    });

    it('uses a single alias routing expression for one linked project', () => {
      expect(
        getProjectRoutingFromSelectedProjectIds({
          availableProjects,
          originProjectId,
          selectedProjectIds: ['linked-id'],
        })
      ).toBe('_alias:linked_local_project');
    });

    it('uses an OR alias expression for multiple custom projects', () => {
      expect(
        getProjectRoutingFromSelectedProjectIds({
          availableProjects,
          originProjectId,
          selectedProjectIds: ['origin-id', 'linked-id'],
        })
      ).toBe(PROJECT_ROUTING.ALL);

      expect(
        getProjectRoutingFromSelectedProjectIds({
          availableProjects: [...availableProjects, { ...linkedProject, _id: 'another-linked-id' }],
          originProjectId,
          selectedProjectIds: ['origin-id', 'linked-id'],
        })
      ).toBe('_alias:(_origin OR linked_local_project)');
    });
  });
});
