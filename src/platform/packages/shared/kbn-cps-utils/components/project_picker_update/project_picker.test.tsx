/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { CPSProject } from '../../types';
import { ProjectPicker } from './project_picker';

class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []);
}

const createProject = (id: string, tags: Partial<CPSProject> = {}): CPSProject => ({
  _id: id,
  _alias: id,
  _type: 'security',
  _organisation: 'org',
  ...tags,
});

const createFetchProjectsByRouting = (projects: CPSProject[]) =>
  jest.fn(async (routing?: string) => {
    if (!routing) {
      return { origin: projects[0] ?? null, linkedProjects: projects.slice(1) };
    }

    const tagClauses = routing
      .split(' AND ')
      .map((clause) => clause.trim())
      .filter((clause) => clause.includes(':') && !clause.includes('_id'));

    const matched = projects.filter((project) =>
      tagClauses.every((clause) => {
        const separatorIndex = clause.indexOf(':');
        const tag = clause.slice(0, separatorIndex) as keyof CPSProject;
        const value = clause.slice(separatorIndex + 1);
        return project[tag] === value;
      })
    );

    if (matched.length === 0) {
      return { origin: null, linkedProjects: [] };
    }

    return {
      origin: matched[0],
      linkedProjects: matched.slice(1),
    };
  });

describe('ProjectPicker', () => {
  beforeEach(() => {
    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('preserves tag-only routing on mount', async () => {
    const onProjectRoutingChange = jest.fn();

    const originProject = createProject('p1', { _type: 'security' });
    const linkedProjects = [createProject('p2', { _type: 'observability' })];
    const availableProjects = [originProject, ...linkedProjects];

    render(
      <ProjectPicker
        availableProjects={availableProjects}
        originProjectId={originProject._id}
        onProjectRoutingChange={onProjectRoutingChange}
        projectRouting="_type:security"
        fetchProjectsByRouting={createFetchProjectsByRouting(availableProjects)}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(`projectPickerListItemSwitch-${originProject._id}`)
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId(`projectPickerListItemSwitch-${linkedProjects[0]._id}`)
    ).not.toBeInTheDocument();
    expect(onProjectRoutingChange).not.toHaveBeenCalled();
  });

  it('preserves tag filters and decoded exclusions on mount', async () => {
    const onProjectRoutingChange = jest.fn();

    const originProject = createProject('p1', { _type: 'security' });
    const linkedProjects = [createProject('p2', { _type: 'security' })];
    const availableProjects = [originProject, ...linkedProjects];

    render(
      <ProjectPicker
        availableProjects={availableProjects}
        originProjectId={originProject._id}
        onProjectRoutingChange={onProjectRoutingChange}
        fetchProjectsByRouting={createFetchProjectsByRouting(availableProjects)}
        projectRouting="_type:security AND (_id:* AND NOT _id:p2)"
      />
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(`projectPickerListItemSwitch-${originProject._id}`)
      ).toHaveAttribute('aria-checked', 'true');
    });
    expect(
      screen.getByTestId(`projectPickerListItemSwitch-${linkedProjects[0]._id}`)
    ).toHaveAttribute('aria-checked', 'false');
    expect(onProjectRoutingChange).not.toHaveBeenCalled();
  });

  it('preserves explicit-ID snapshot routing on mount', async () => {
    const onProjectRoutingChange = jest.fn();
    const matchingProject = createProject('matching');
    const matching2Project = createProject('matching2');
    const nonMatchingProject = createProject('non-matching');

    const availableProjects = [matchingProject, matching2Project, nonMatchingProject];

    render(
      <ProjectPicker
        availableProjects={availableProjects}
        originProjectId={matchingProject._id}
        onProjectRoutingChange={onProjectRoutingChange}
        projectRouting="_id:matching OR _id:matching2"
        projectRoutingStrategy="snapshot"
        fetchProjectsByRouting={createFetchProjectsByRouting(availableProjects)}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(`projectPickerListItemSwitch-${matchingProject._id}`)
      ).toHaveAttribute('aria-checked', 'true');
    });
    expect(
      screen.getByTestId(`projectPickerListItemSwitch-${matching2Project._id}`)
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByTestId(`projectPickerListItemSwitch-${nonMatchingProject._id}`)
    ).toHaveAttribute('aria-checked', 'false');
    expect(onProjectRoutingChange).not.toHaveBeenCalled();
  });
});
